// AI-задача: правки документации для pull request владельца.
//
// Главное — README: улучшить существующий или написать, если его нет. Файлы
// вроде LICENSE и CONTRIBUTING Pulse добавляет шаблонами; модель их не пишет,
// а только оценивает, насколько они поднимут балл документации.
//
// README модель возвращает целиком: это текст, а не код, и владелец увидит
// дифф построчно. Пометок TODO модель не оставляет: чего нет в данных,
// дописывает аккуратно и в общих словах, без конкретики, которую не проверить.

/** Меняется вместе с правилами промпта — иначе кэш вернёт ответы по старым. */
const PROMPT_VERSION = 2;

import { z } from 'zod';
import type { AiCache } from '../cache';
import type { AiProvider } from '../provider';
import type { AiTelemetry } from '../telemetry';
import { runAiTask, type RunAiTaskResult } from '../runner';

const gain = z.number().min(0).max(100).catch(0);

const docsSchema = z.object({
  changes: z
    .array(
      z.object({
        path: z.string().min(1).max(200),
        title: z.string().min(1).max(160),
        why: z.string().max(600),
        category_gain: gain,
        content: z.string().min(1).max(60_000),
      }),
    )
    .max(3),
  estimates: z.array(z.object({ path: z.string(), category_gain: gain })).max(10).catch([]),
});

export type ImproveDocsOutput = z.infer<typeof docsSchema>;

export type ImproveDocsInput = {
  orgRepo: string;
  description: string | null;
  language: string | null;
  files: string[];
  readme: { path: string; content: string } | null;
  manifests: Array<{ path: string; excerpt: string }>;
  rubric: { score: number; summary: string | null } | null;
  currentDocsScore: number | null;
  plannedFiles: Array<{ path: string; title: string }>;
  /** Только для ключа кэша, ставит сама задача. */
  promptVersion?: number;
};

const SYSTEM = `Ты — технический писатель. Улучшаешь документацию чужого репозитория
так, чтобы её было не стыдно слить в основную ветку. Отвечай ТОЛЬКО валидным JSON
без markdown-ограждений вокруг JSON.

Формат ответа СТРОГО такой:
{
  "changes": [
    {
      "path": "README.md",
      "title": "<что сделано, по-русски, до 100 символов>",
      "why": "<зачем это владельцу, 1-2 предложения по-русски>",
      "category_gain": <на сколько баллов из 100 вырастет оценка документации, если принять только эту правку>,
      "content": "<ПОЛНЫЙ итоговый текст файла>"
    }
  ],
  "estimates": [ { "path": "<файл из списка ЗАПЛАНИРОВАННЫЕ>", "category_gain": <число> } ]
}

Правила:
- Главная правка — README. Есть README — улучши его: сохрани всё верное, язык и
  стиль автора, добавь недостающие разделы (что это, установка, запуск, примеры,
  конфигурация, как помочь, лицензия). Нет README — напиши его.
- Дополнительно можешь предложить до двух новых файлов docs/*.md, только если в
  данных есть что по-настоящему описать (например, конфигурацию или API).
- НЕ пиши LICENSE, CONTRIBUTING, CHANGELOG, CODE_OF_CONDUCT, .gitignore,
  .editorconfig — их добавят шаблоном. Для файлов из списка ЗАПЛАНИРОВАННЫЕ
  верни только оценку в "estimates".
- Никаких пометок TODO, FIXME, «допишите», «укажите здесь» и заглушек в угловых
  скобках. Текст должен быть готов к слиянию как есть.
- Чего нет в данных — допиши сам, аккуратно и по смыслу проекта: опиши
  назначение по коду, структуре файлов и описанию; шаги запуска — стандартные
  для стека, который видно по манифестам и файлам. Пиши в общих словах там, где
  не уверен, и не утверждай конкретику, которую нельзя проверить.
- Не выдумывай проверяемые факты: команды берутся из манифестов (scripts,
  зависимости, цели) или являются стандартными для стека; ссылки — только на
  git.sourcecraft.dev этого репозитория; никаких бейджей сторонних сервисов,
  несуществующих функций, версий, адресов и контактов.
- Язык README — как у существующего; если README нет — русский.
- category_gain реалистичный: учитывай текущую оценку, правка не может поднять
  её выше 100. Если README уже хороший — правка маленькая и прирост маленький.
- Если улучшать нечего — верни "changes": [].`;

function buildPrompt(input: ImproveDocsInput) {
  const manifests = input.manifests.length
    ? input.manifests.map((m) => `--- ${m.path} ---\n${m.excerpt}`).join('\n\n')
    : '(манифестов нет)';
  const user = [
    `Репозиторий: ${input.orgRepo}`,
    `Описание: ${input.description ?? 'нет'}`,
    `Основной язык: ${input.language ?? 'неизвестен'}`,
    `Текущая оценка документации: ${input.currentDocsScore ?? 'нет данных'} из 100`,
    input.rubric?.summary ? `Замечания рецензента документации: ${input.rubric.summary}` : '',
    '',
    'ЗАПЛАНИРОВАННЫЕ шаблоном файлы (оцени их в estimates):',
    input.plannedFiles.length ? input.plannedFiles.map((f) => `- ${f.path} — ${f.title}`).join('\n') : '(нет)',
    '',
    'ФАЙЛЫ РЕПОЗИТОРИЯ:',
    input.files.join('\n') || '(неизвестны)',
    '',
    'МАНИФЕСТЫ:',
    manifests,
    '',
    input.readme ? `ТЕКУЩИЙ ${input.readme.path}:\n${input.readme.content}` : 'README ОТСУТСТВУЕТ.',
  ]
    .filter((line) => line !== '')
    .join('\n');
  return { system: SYSTEM, user, maxTokens: 8_000, timeoutMs: 150_000 };
}

export async function runImproveDocs(args: {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  input: ImproveDocsInput;
}): Promise<RunAiTaskResult<ImproveDocsOutput>> {
  return runAiTask({
    provider: args.provider,
    cache: args.cache,
    telemetry: args.telemetry,
    task: 'improve_docs',
    // Версия промпта входит в ключ кэша, а в сам промпт не попадает.
    input: { ...args.input, promptVersion: PROMPT_VERSION },
    schema: docsSchema,
    buildPrompt,
    fallback: () => null,
  });
}
