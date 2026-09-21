// AI-задача №4: ревью самого кода по выборке файлов.
//
// Заменяет собой категорию `code` — так же, как рубрика README заменяет `docs`.
// Если задача упала, scoreRepo считает код по измеримым метрикам из клона
// (тесты, длина файлов, комментарии, TODO).
//
// На вход идут начала самых крупных файлов исходников: там и живёт основная
// логика. Это самый дорогой запрос из четырёх — примерно 10–15 тысяч токенов
// промпта, поэтому выборка ограничена и обрезана.

import { z } from 'zod';
import type { RepoFacts } from '../../collect';
import type { AiCache } from '../cache';
import type { AiProvider } from '../provider';
import type { AiTelemetry } from '../telemetry';
import { runAiTask, type RunAiTaskResult } from '../runner';

const criterionSchema = z.number().min(0).max(100);

const reviewSchema = z.object({
  score: criterionSchema,
  criteria: z.object({
    readability: criterionSchema,
    structure: criterionSchema,
    error_handling: criterionSchema,
    tests: criterionSchema,
    consistency: criterionSchema,
  }),
  findings: z.array(z.string().max(300)).max(5),
  summary: z.string().max(600),
});

export type CodeReviewScore = z.infer<typeof reviewSchema>;

export type CodeReviewInput = {
  orgRepo: string;
  language: string | null;
  /** Языковой состав — модели полезно знать, что перед ней не весь проект. */
  languageShares: Array<{ name: string; sharePercent: number }>;
  /** Измеримые факты: модель не должна их пересчитывать, только учитывать. */
  measured: {
    sourceFiles: number;
    testFiles: number;
    medianFileLines: number | null;
    longFileSharePercent: number | null;
    commentSharePercent: number | null;
    todoPerKiloLines: number | null;
    hasLinterConfig: boolean;
    hasCiConfig: boolean;
  };
  files: Array<{ path: string; lines: number; excerpt: string }>;
};

export function buildCodeReviewInput(facts: RepoFacts): CodeReviewInput {
  return {
    orgRepo: `${facts.org}/${facts.repo}`,
    language: facts.language,
    languageShares: facts.languages.map((l) => ({ name: l.name, sharePercent: l.sharePercent })),
    measured: {
      sourceFiles: facts.code.sourceFiles,
      testFiles: facts.code.testFiles,
      medianFileLines: facts.code.medianFileLines,
      longFileSharePercent: facts.code.longFileSharePercent,
      commentSharePercent: facts.code.commentSharePercent,
      todoPerKiloLines: facts.code.todoPerKiloLines,
      hasLinterConfig: facts.tree.flags.hasLinterConfig,
      hasCiConfig: facts.tree.flags.hasCiConfig,
    },
    files: facts.code.sample,
  };
}

const SYSTEM = `Ты — опытный ревьюер кода. Тебе дают выборку файлов из открытого
репозитория и уже посчитанные метрики. Оцени сам код, а не популярность проекта.
Отвечай ТОЛЬКО валидным JSON без markdown-ограждений. Никаких пояснений вне JSON.

Формат ответа СТРОГО такой (все criteria.* — целые числа от 0 до 100):
{
  "score": <число 0..100>,
  "criteria": {
    "readability": <число 0..100>,
    "structure": <число 0..100>,
    "error_handling": <число 0..100>,
    "tests": <число 0..100>,
    "consistency": <число 0..100>
  },
  "findings": ["<наблюдение по-русски, до 200 символов>"],
  "summary": "<2-3 предложения по-русски, до 500 символов>"
}

Что означают критерии:
- readability: понятность имён, размер функций, сколько усилий нужно, чтобы
  прочитать файл впервые.
- structure: разделение ответственности, отсутствие «божественных» файлов,
  внятные границы модулей.
- error_handling: обработка ошибок и граничных случаев, а не «happy path».
- tests: есть ли тесты и похожи ли они на осмысленные (учти метрику по числу
  тестовых файлов — исходников тебе показали не все).
- consistency: единый стиль внутри выборки, отсутствие следов копипасты.

Правила:
- score — взвешенный итог; не завышай его из вежливости и не занижай за
  незнакомый стиль языка.
- findings: 2-4 конкретных наблюдения с привязкой к файлам из выборки.
  Общих слов вроде «можно улучшить читаемость» не пиши.
- Выборка — только часть проекта. Не делай выводов о том, чего не видел.`;

function buildPrompt(input: CodeReviewInput): {
  system: string;
  user: string;
  maxTokens?: number;
} {
  const languages =
    input.languageShares.length > 0
      ? input.languageShares.map((l) => `${l.name} ${l.sharePercent}%`).join(', ')
      : (input.language ?? 'неизвестно');

  const measured = [
    `файлов исходников: ${input.measured.sourceFiles}`,
    `файлов тестов: ${input.measured.testFiles}`,
    `медианная длина файла: ${fmt(input.measured.medianFileLines)} строк`,
    `файлов длиннее 500 строк: ${fmt(input.measured.longFileSharePercent)}%`,
    `строк-комментариев: ${fmt(input.measured.commentSharePercent)}%`,
    `TODO/FIXME на 1000 строк: ${fmt(input.measured.todoPerKiloLines)}`,
    `конфиг линтера: ${input.measured.hasLinterConfig ? 'есть' : 'нет'}`,
    `конфиг CI: ${input.measured.hasCiConfig ? 'есть' : 'нет'}`,
  ].join('\n');

  const files = input.files.length
    ? input.files
        .map(
          (file) =>
            `--- ФАЙЛ: ${file.path} (${file.lines} строк, показано начало) ---\n${file.excerpt}`,
        )
        .join('\n\n')
    : '(файлы прочитать не удалось)';

  const user = [
    `Репозиторий: ${input.orgRepo}`,
    `Языки: ${languages}`,
    '',
    'ПОСЧИТАННЫЕ МЕТРИКИ:',
    measured,
    '',
    'ВЫБОРКА ФАЙЛОВ:',
    files,
  ].join('\n');

  return { system: SYSTEM, user, maxTokens: 1600 };
}

export async function runCodeReview(args: {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  facts: RepoFacts;
}): Promise<RunAiTaskResult<CodeReviewScore>> {
  return runAiTask({
    provider: args.provider,
    cache: args.cache,
    telemetry: args.telemetry,
    task: 'code_review',
    input: buildCodeReviewInput(args.facts),
    schema: reviewSchema,
    buildPrompt,
    // Деградация: без ревью код считается по измеримым метрикам.
    fallback: () => null,
  });
}

function fmt(value: number | null): string {
  return value === null ? 'нет данных' : String(value);
}
