// AI-задача №5, она же первый шаг ревью: выбрать, что вообще читать.
//
// Раньше в ревью уходили самые длинные файлы. На настоящем репозитории это
// почти всегда мимо: длиннее всего словари, таблицы соответствий, экспортные
// «бочки» и сгенерированные типы. Модель, глядя на структуру проекта, выбирает
// осмысленнее — и заодно не тянет на вход то, что читать не стоило.
//
// Задача дешёвая: на вход идут только пути, без содержимого. Она вызывается,
// пока открыт клон (см. collect → selectCodeFiles), потому что прочитать
// выбранное нужно до того, как временный каталог будет удалён.

import { z } from 'zod';
import type { AiCache } from '../cache';
import type { AiProvider } from '../provider';
import type { AiTelemetry } from '../telemetry';
import { runAiTask, type RunAiTaskResult } from '../runner';
import type { CodeCatalog, CodeCatalogEntry } from '../../git/code-facts';

const selectionSchema = z.object({
  pick: z.array(z.string().max(300)).max(14),
  reason: z.string().max(400).optional(),
});

export type FileSelection = z.infer<typeof selectionSchema>;

export type FileSelectionInput = {
  orgRepo: string;
  language: string | null;
  /** Сколько файлов-кандидатов всего — модель должна понимать масштаб. */
  total: number;
  /** Перепись каталогов: где что лежит и что мы не читали. */
  directories: Array<{ dir: string; files: number; languages: string[]; skipped: boolean }>;
  files: CodeCatalogEntry[];
};

const SYSTEM = `Ты выбираешь файлы для ревью кода. Тебе дают список путей из
репозитория — без содержимого. Нужно выбрать от 6 до 12 файлов, по которым
лучше всего видно инженерное качество проекта.

Отвечай ТОЛЬКО валидным JSON без markdown-ограждений:
{"pick": ["<путь ровно как в списке>", ...], "reason": "<одно предложение по-русски>"}

В большом проекте выбирай файлы из разных каталогов: одна папка из десяти —
это не портрет проекта. Каталоги с пометкой «не читаем» в выборе не участвуют.

Что выбирать:
- файлы с основной логикой: обработчики, движки, сервисы, алгоритмы;
- один-два показательных теста, если они есть;
- точки входа, если по ним видно устройство проекта.

Чего избегать:
- конфигов, констант, словарей, локализаций, таблиц соответствий;
- индексных файлов, которые только реэкспортируют;
- сгенерированного кода, схем, моков и фикстур;
- файлов, про которые по имени понятно, что там данные, а не код.

Пути копируй буква в букву из списка. Ничего не выдумывай.`;

function buildPrompt(input: FileSelectionInput): {
  system: string;
  user: string;
  maxTokens?: number;
} {
  const list = input.files
    .map((file) => `${file.path}${file.test ? '  [тест]' : ''}`)
    .join('\n');

  // Перепись даёт масштаб: по одному списку путей не видно, что каталог на
  // четыре тысячи файлов представлен в нём двумя десятками строк.
  const census = input.directories
    .map(
      (dir) =>
        `${dir.dir} — ${dir.files} ${pluralFiles(dir.files)}` +
        (dir.languages.length > 0 ? `, ${dir.languages.join('/')}` : '') +
        (dir.skipped ? ' — не читаем' : ''),
    )
    .join('\n');

  const user = [
    `Репозиторий: ${input.orgRepo}`,
    `Основной язык: ${input.language ?? 'неизвестно'}`,
    `Файлов с кодом всего: ${input.total}${
      input.files.length < input.total
        ? `, ниже ${input.files.length} — по кругу из разных каталогов`
        : ''
    }`,
    '',
    'КАТАЛОГИ:',
    census || '(перепись недоступна)',
    '',
    'ПУТИ:',
    list,
  ].join('\n');

  return { system: SYSTEM, user, maxTokens: 700 };
}

function pluralFiles(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'файлов';
  const mod10 = n % 10;
  if (mod10 === 1) return 'файл';
  if (mod10 >= 2 && mod10 <= 4) return 'файла';
  return 'файлов';
}

export async function runFileSelection(args: {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  orgRepo: string;
  language: string | null;
  catalog: CodeCatalog;
}): Promise<RunAiTaskResult<FileSelection>> {
  return runAiTask({
    provider: args.provider,
    cache: args.cache,
    telemetry: args.telemetry,
    task: 'file_selection',
    input: {
      orgRepo: args.orgRepo,
      language: args.language,
      total: args.catalog.totalFiles,
      directories: args.catalog.directories.map((dir) => ({
        dir: dir.dir,
        files: dir.files,
        languages: dir.languages,
        skipped: dir.skipped,
      })),
      files: args.catalog.files,
    } satisfies FileSelectionInput,
    schema: selectionSchema,
    buildPrompt,
    // Деградация: пустой выбор — сборщик возьмёт файлы по размеру.
    fallback: () => ({ pick: [] }),
  });
}
