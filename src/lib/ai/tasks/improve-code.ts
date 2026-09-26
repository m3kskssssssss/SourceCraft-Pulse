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

/** Меняется вместе с правилами промпта — иначе кэш вернёт ответы по старым. */
const PROMPT_VERSION = 3;

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
    .max(10),
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
  /** Только для ключа кэша, ставит сама задача. */
  promptVersion?: number;
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
- Правки точечные и СИЛЬНЫЕ: каждая закрывает конкретный риск, который можно
  назвать одной фразой. Что считается сильной правкой, по убыванию важности:
  1) явный баг: неверное условие, выход за границы, деление на ноль, гонка,
     необработанный null/undefined/None, неверная работа с датами и деньгами;
  2) безопасность: SQL/командные инъекции, eval, секреты в коде (читать из
     переменных окружения), отсутствие проверки входных данных, небезопасный
     разбор;
  3) надёжность: не обработанные ошибки ввода-вывода, сети и парсинга,
     утечки ресурсов (незакрытые файлы, соединения), отсутствие таймаутов;
  4) тесты на функции из ФАЙЛОВ — если в проекте уже есть тестовый фреймворк;
  5) дублирование и мёртвый код, из-за которых легко ошибиться;
  6) типы и понятные имена там, где сейчас легко ошибиться.
- СЛАБЫЕ правки НЕ предлагай вовсе: одно переименование, комментарии,
  пересказывающие код, форматирование, перестановка импортов, добавление логов,
  замена одной строки на «чуть красивее». Лучше меньше правок, чем слабые.
- Не переформатируй файлы, не переписывай их целиком, не меняй поведение
  публичного API без явной причины.
- Каждая правка (элемент "changes") самостоятельна: корректна без остальных.
  Одна правка — один файл.
- create — для новых файлов, в первую очередь тестов. Тесты пиши только на
  фреймворке, который уже есть в проекте (видно по манифестам и файлам), и только
  для кода, который видишь целиком.
- Сохраняй стиль файла: отступы, кавычки, язык комментариев.
- Нельзя: новые зависимости, лок-файлы, CI, конфиги сборки, .env, секреты.
- НИЧЕГО НЕ ВЫДУМЫВАЙ: не вызывай функций и модулей, которых не видишь.
- Не оставляй пометок TODO, FIXME, HACK и заглушек: правка должна быть
  законченной. Где не хватает данных — сделай аккуратное решение, подходящее по
  смыслу окружающего кода, или не предлагай эту правку.
- Цель — 4-7 сильных правок по этим файлам: пройди каждый файл целиком и найди
  в нём всё, что подходит под список выше. Если в проекте есть тестовый
  фреймворк, хотя бы одна правка — новый файл тестов для кода из ФАЙЛОВ.
  Уверенных сильных правок меньше — верни столько, сколько есть; нет ни одной —
  "changes": [].
- В "why" назови конкретный риск: что сломается, при каких входных данных.
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
  return { system: SYSTEM, user, maxTokens: 16_000, timeoutMs: 190_000 };
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
    // Версия промпта входит в ключ кэша, а в сам промпт не попадает.
    input: { ...args.input, promptVersion: PROMPT_VERSION },
    schema: codeSchema,
    buildPrompt,
    fallback: () => null,
  });
}
