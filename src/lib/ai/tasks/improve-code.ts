// AI-задача: правки кода для pull request владельца.
//
// Модель видит полные тексты нескольких файлов (тех, что читал ревьюер при
// оценке), его находки и измеренные числа. Правки существующих файлов — только
// блоками «найти → заменить» (lib/improvements/edits.ts): фрагмент для поиска
// дословно копируется из файла, и мы применяем его механически. Новые файлы
// (например, тесты) — целиком.
//
// Каждая правка должна быть самостоятельной: владелец может снять любую
// галочку, и оставшиеся обязаны работать без неё.

import { z } from 'zod';
import type { AiCache } from '../cache';
import type { AiProvider } from '../provider';
import type { AiTelemetry } from '../telemetry';
import { runAiTask, type RunAiTaskResult } from '../runner';

const gain = z.number().min(0).max(100).catch(0);

const base = {
  path: z.string().min(1).max(300),
  title: z.string().min(1).max(160),
  why: z.string().max(600),
  category_gain: gain,
};

const codeSchema = z.object({
  changes: z
    .array(
      z.union([
        z.object({
          ...base,
          action: z.literal('modify'),
          edits: z
            .array(z.object({ search: z.string().min(1).max(8_000), replace: z.string().max(12_000) }))
            .min(1)
            .max(10),
        }),
        z.object({ ...base, action: z.literal('create'), content: z.string().min(1).max(40_000) }),
      ]),
    )
    .max(8),
  estimates: z.array(z.object({ path: z.string(), category_gain: gain })).max(10).catch([]),
});

export type ImproveCodeOutput = z.infer<typeof codeSchema>;

export type ImproveCodeInput = {
  orgRepo: string;
  language: string | null;
  currentCodeScore: number | null;
  reviewSummary: string | null;
  findings: string[];
  measured: Record<string, string | number | boolean | null>;
  files: Array<{ path: string; content: string }>;
  otherFiles: string[];
  manifests: Array<{ path: string; excerpt: string }>;
  plannedFiles: Array<{ path: string; title: string }>;
};

const SYSTEM = `Ты — старший инженер. Готовишь небольшой, аккуратный pull request с
исправлениями в чужом репозитории. Его прочитает автор и сольёт, только если каждая
правка очевидно полезна и безопасна. Отвечай ТОЛЬКО валидным JSON без
markdown-ограждений вокруг JSON.

Формат ответа СТРОГО такой:
{
  "changes": [
    {
      "action": "modify",
      "path": "<путь файла из раздела ФАЙЛЫ>",
      "title": "<что исправлено, по-русски, до 100 символов>",
      "why": "<какую проблему это решает, 1-2 предложения по-русски>",
      "category_gain": <на сколько баллов из 100 вырастет оценка кода от этой правки>,
      "edits": [ { "search": "<дословный фрагмент файла>", "replace": "<новый фрагмент>" } ]
    },
    {
      "action": "create",
      "path": "<путь нового файла>",
      "title": "...", "why": "...", "category_gain": <число>,
      "content": "<полный текст нового файла>"
    }
  ],
  "estimates": [ { "path": "<файл из списка ЗАПЛАНИРОВАННЫЕ>", "category_gain": <число> } ]
}

Как писать правки:
- modify — только для файлов из раздела ФАЙЛЫ. "search" копируй из файла
  ДОСЛОВНО, символ в символ, с отступами; 2-15 строк; фрагмент должен встречаться
  в файле ровно один раз. Не сошёлся фрагмент — правку выбросят целиком.
- Правки точечные, по находкам ревьюера и тому, что видишь сам: обработка ошибок и
  граничных случаев, явные баги, мёртвый код, дублирование, магические числа,
  понятные имена, типы. Не переформатируй файлы, не переписывай их целиком, не
  меняй поведение публичного API без явной причины.
- Каждая правка (элемент "changes") самостоятельна: корректна без остальных.
  Одна правка — один файл.
- create — для новых файлов, в первую очередь тестов. Тесты пиши только на
  фреймворке, который уже есть в проекте (видно по манифестам и файлам), и только
  для кода, который видишь целиком.
- Сохраняй стиль файла: отступы, кавычки, язык комментариев.
- Нельзя: новые зависимости, лок-файлы, CI, конфиги сборки, .env, секреты.
- НИЧЕГО НЕ ВЫДУМЫВАЙ: не вызывай функций и модулей, которых не видишь.
- Не больше 6 правок. Лучше 2 надёжные, чем 6 сомнительных. Нет уверенных
  правок — верни "changes": [].
- category_gain реалистичный, обычно 1-6 баллов за правку; текущая оценка кода
  и потолок 100 — ориентир. Для файлов из ЗАПЛАНИРОВАННЫЕ верни только оценку.`;

function buildPrompt(input: ImproveCodeInput) {
  const measured = Object.entries(input.measured)
    .map(([key, value]) => `${key}: ${value ?? 'нет данных'}`)
    .join('\n');
  const files = input.files
    .map((f) => `===== ФАЙЛ: ${f.path} =====\n${f.content}\n===== КОНЕЦ ${f.path} =====`)
    .join('\n\n');
  const manifests = input.manifests.length
    ? input.manifests.map((m) => `--- ${m.path} ---\n${m.excerpt}`).join('\n\n')
    : '(манифестов нет)';
  const user = [
    `Репозиторий: ${input.orgRepo}`,
    `Основной язык: ${input.language ?? 'неизвестен'}`,
    `Текущая оценка кода: ${input.currentCodeScore ?? 'нет данных'} из 100`,
    input.reviewSummary ? `Итог ревью: ${input.reviewSummary}` : '',
    '',
    'НАХОДКИ РЕВЬЮЕРА:',
    input.findings.length ? input.findings.map((f) => `- ${f}`).join('\n') : '(нет)',
    '',
    'ИЗМЕРЕНО:',
    measured,
    '',
    'ЗАПЛАНИРОВАННЫЕ шаблоном файлы (оцени их в estimates):',
    input.plannedFiles.length ? input.plannedFiles.map((f) => `- ${f.path} — ${f.title}`).join('\n') : '(нет)',
    '',
    'ДРУГИЕ ФАЙЛЫ РЕПОЗИТОРИЯ (содержимое не показано):',
    input.otherFiles.join('\n') || '(нет)',
    '',
    'МАНИФЕСТЫ:',
    manifests,
    '',
    'ФАЙЛЫ:',
    files,
  ]
    .filter((line) => line !== '')
    .join('\n');
  return { system: SYSTEM, user, maxTokens: 12_000, timeoutMs: 190_000 };
}

export async function runImproveCode(args: {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  input: ImproveCodeInput;
}): Promise<RunAiTaskResult<ImproveCodeOutput>> {
  return runAiTask({
    provider: args.provider,
    cache: args.cache,
    telemetry: args.telemetry,
    task: 'improve_code',
    input: args.input,
    schema: codeSchema,
    buildPrompt,
    fallback: () => null,
  });
}
