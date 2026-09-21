// Измеримые факты о самом коде, а не о процессе вокруг него.
//
// Раньше категория «Код» держалась на двух признаках из дерева файлов («есть
// папка с тестами», «есть конфиг линтера») и двух метриках, которые всегда
// были «нет данных». Теперь читаем исходники из клона и считаем то, что видно
// в файлах: сколько тестов, насколько крупные файлы, много ли пояснений,
// сколько незакрытых TODO.
//
// Все пороги — эмпирические, см. scoring/config.ts. Здесь только измерение.

import { languageOf } from './languages';
import { readFileFromClone, type RepoClone } from './clone';

export type CodeFacts = {
  /** Удалось ли прочитать хоть один файл с кодом. */
  available: boolean;
  /** Файлов с исходным кодом (без тестов и мусорных каталогов). */
  sourceFiles: number;
  /** Файлов с тестами. */
  testFiles: number;
  /** Тестовых файлов на 100 файлов исходников. */
  testsPer100SourceFiles: number | null;
  /** Строк в прочитанных файлах исходников. */
  totalLines: number;
  /** Медианная длина файла в строках. */
  medianFileLines: number | null;
  /** Доля файлов длиннее LONG_FILE_LINES, 0..100. */
  longFileSharePercent: number | null;
  /** Доля строк-комментариев, 0..100. */
  commentSharePercent: number | null;
  /** Пометок TODO/FIXME/HACK на 1000 строк. */
  todoPerKiloLines: number | null;
  /** Сколько файлов реально прочитали (упираемся в лимит). */
  scannedFiles: number;
  /** Выборка крупнейших файлов — вход для AI-ревью. */
  sample: CodeSampleFile[];
  errors: string[];
};

export type CodeSampleFile = {
  path: string;
  lines: number;
  /** Начало файла, обрезанное по лимиту символов. */
  excerpt: string;
};

export type CodeFactsOptions = {
  /** Сколько файлов максимум читаем. */
  fileLimit?: number;
  /** Файлы крупнее считаем сгенерированными и пропускаем. */
  maxFileBytes?: number;
  /** Сколько файлов попадёт в выборку для модели. */
  sampleFiles?: number;
  /** Сколько символов берём из каждого файла выборки. */
  sampleChars?: number;
};

// Лимиты подобраны под один прогон в Vercel-функции на 300 с: чтение тысячи
// блобов из клона в /tmp занимает единицы секунд, а выборка в двенадцать
// файлов по 4 000 символов — это ~15 тысяч токенов промпта на ревью.
const DEFAULT_FILE_LIMIT = 1_000;
const DEFAULT_MAX_FILE_BYTES = 200 * 1024;
const DEFAULT_SAMPLE_FILES = 12;
const DEFAULT_SAMPLE_CHARS = 4_000;

/** Файл длиннее — повод задуматься о разбиении. */
export const LONG_FILE_LINES = 500;

/** Каталоги и имена, которые не характеризуют код проекта. */
const SKIP_PATH_PARTS = [
  'node_modules/',
  'vendor/',
  'third_party/',
  'thirdparty/',
  'dist/',
  'build/',
  'out/',
  '.next/',
  'target/',
  'generated/',
  'migrations/',
  '.min.',
  '.gen.',
  '.pb.',
  'bundle.',
];

/** Признаки тестового файла. */
const TEST_PATH_PARTS = ['test/', 'tests/', '__tests__/', 'spec/', 'specs/', 'testing/'];
const TEST_NAME_RE = /(^|[._-])(test|tests|spec|specs)\.[a-z0-9]+$/i;
const TEST_PREFIX_RE = /^test_[^/]+$/i;

/** Строка, которая целиком является комментарием. Грубо, зато на все языки. */
const COMMENT_LINE_RE = /^\s*(\/\/|\/\*|\*|#|--|;;|%|<!--)/;
const TODO_RE = /\b(TODO|FIXME|HACK|XXX)\b/;

export function emptyCodeFacts(errors: string[] = []): CodeFacts {
  return {
    available: false,
    sourceFiles: 0,
    testFiles: 0,
    testsPer100SourceFiles: null,
    totalLines: 0,
    medianFileLines: null,
    longFileSharePercent: null,
    commentSharePercent: null,
    todoPerKiloLines: null,
    scannedFiles: 0,
    sample: [],
    errors,
  };
}

export async function collectCodeFacts(
  repo: RepoClone,
  files: string[],
  options: CodeFactsOptions = {},
): Promise<CodeFacts> {
  const fileLimit = options.fileLimit ?? DEFAULT_FILE_LIMIT;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const sampleFiles = options.sampleFiles ?? DEFAULT_SAMPLE_FILES;
  const sampleChars = options.sampleChars ?? DEFAULT_SAMPLE_CHARS;

  const code = files.filter((path) => languageOf(path) !== null && !isSkipped(path));
  const tests = code.filter(isTestPath);
  const sources = code.filter((path) => !isTestPath(path));

  if (sources.length === 0) {
    return {
      ...emptyCodeFacts(['code_files_not_found']),
      sourceFiles: 0,
      testFiles: tests.length,
    };
  }

  // Читаем не всё: на монорепозитории это тысячи блобов. Берём начало списка
  // (он отсортирован по пути, то есть срез получается по всему дереву).
  const toRead = sources.slice(0, fileLimit);

  const errors: string[] = [];
  const perFileLines: number[] = [];
  const read: Array<{ path: string; lines: number; text: string }> = [];
  let totalLines = 0;
  let commentLines = 0;
  let todoHits = 0;

  for (const path of toRead) {
    const text = await readFileFromClone(repo, path);
    if (text === null || text.length > maxFileBytes) continue;

    const lines = text.split('\n');
    perFileLines.push(lines.length);
    totalLines += lines.length;
    for (const line of lines) {
      if (COMMENT_LINE_RE.test(line)) commentLines += 1;
      if (TODO_RE.test(line)) todoHits += 1;
    }
    read.push({ path, lines: lines.length, text });
  }

  if (read.length === 0) {
    return {
      ...emptyCodeFacts(['code_files_unreadable']),
      sourceFiles: sources.length,
      testFiles: tests.length,
    };
  }

  const longFiles = perFileLines.filter((n) => n > LONG_FILE_LINES).length;

  // В выборку для модели — самые крупные файлы: в них и живёт основная логика.
  const sample = [...read]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, sampleFiles)
    .map((file) => ({
      path: file.path,
      lines: file.lines,
      excerpt: file.text.slice(0, sampleChars),
    }));

  return {
    available: true,
    sourceFiles: sources.length,
    testFiles: tests.length,
    testsPer100SourceFiles: round1((tests.length / sources.length) * 100),
    totalLines,
    medianFileLines: median(perFileLines),
    longFileSharePercent: round1((longFiles / perFileLines.length) * 100),
    commentSharePercent: round1((commentLines / totalLines) * 100),
    todoPerKiloLines: round1((todoHits / totalLines) * 1000),
    scannedFiles: read.length,
    sample,
    errors,
  };
}

// ---------- helpers ----------

function isSkipped(path: string): boolean {
  const lower = path.toLowerCase();
  return SKIP_PATH_PARTS.some((part) => lower.includes(part));
}

export function isTestPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (TEST_PATH_PARTS.some((part) => lower.includes(part))) return true;
  const name = lower.slice(lower.lastIndexOf('/') + 1);
  return TEST_NAME_RE.test(name) || TEST_PREFIX_RE.test(name);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2)
    : sorted[middle]!;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
