// Измеримые факты о самом коде, а не о процессе вокруг него.
//
// Раньше категория «Код» держалась на двух признаках из дерева файлов («есть
// папка с тестами», «есть конфиг линтера») и двух метриках, которые всегда
// были «нет данных». Теперь читаем исходники из клона и считаем то, что видно
// в файлах: сколько тестов, насколько крупные файлы, много ли пояснений,
// сколько незакрытых TODO.
//
// Выборка для ревью выбирается в два шага. Сначала отбираем кандидатов по
// расширению и каталогу — так в выборку не попадают картинки, бандлы и
// сгенерированный код. Затем список путей показывается модели (callback
// `selectFiles`), и она сама решает, что читать: у крупнейших файлов есть
// неприятная привычка оказываться словарями и таблицами. Если выбор не
// сработал, берём прежнюю эвристику — самые большие файлы.
//
// Чтение идёт пачками и по дедлайну: на репозитории уровня gravity-ui/uikit
// последовательное чтение тысячи блобов съедало весь бюджет анализа.
//
// Все пороги — эмпирические, см. scoring/config.ts. Здесь только измерение.

import { languageOf } from './languages';
import { readFilesFromClone, type IndexedClone } from './clone';

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
  /** Сколько файлов реально прочитали (упираемся в лимит или дедлайн). */
  scannedFiles: number;
  /** Кто выбрал выборку для ревью. */
  sampleSource: 'model' | 'size' | 'none';
  /** Выборка файлов — вход для AI-ревью. */
  sample: CodeSampleFile[];
  errors: string[];
};

export type CodeSampleFile = {
  path: string;
  lines: number;
  /** Начало файла, обрезанное по лимиту символов. */
  excerpt: string;
};

/** Что показываем модели на первом проходе: только структура, без содержимого. */
export type CodeCatalogEntry = {
  path: string;
  /** Язык по расширению — модели проще ориентироваться. */
  language: string;
  test: boolean;
};

export type CodeFactsOptions = {
  /** Сколько файлов максимум читаем ради метрик. */
  fileLimit?: number;
  /** Файлы крупнее считаем сгенерированными и пропускаем. */
  maxFileBytes?: number;
  /** Сколько файлов попадёт в выборку для модели. */
  sampleFiles?: number;
  /** Сколько символов берём из каждого файла выборки. */
  sampleChars?: number;
  /** Момент, после которого чтение прекращается. */
  deadline?: number;
  /**
   * Выбор файлов для ревью по структуре проекта. Возвращает пути из каталога.
   * Ошибки и таймауты — забота вызывающего: здесь просто откатимся к размеру.
   */
  selectFiles?: (catalog: CodeCatalogEntry[]) => Promise<string[]>;
};

const DEFAULT_FILE_LIMIT = 600;
const DEFAULT_MAX_FILE_BYTES = 200 * 1024;
const DEFAULT_SAMPLE_FILES = 12;
const DEFAULT_SAMPLE_CHARS = 4_000;
/** Сколько путей показываем модели: больше — лишние токены без пользы. */
const CATALOG_LIMIT = 400;

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
  'fixtures/',
  '__snapshots__/',
  '.min.',
  '.gen.',
  '.pb.',
  'bundle.',
  '.lock.',
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
    sampleSource: 'none',
    sample: [],
    errors,
  };
}

export async function collectCodeFacts(
  clone: IndexedClone,
  options: CodeFactsOptions = {},
): Promise<CodeFacts> {
  const fileLimit = options.fileLimit ?? DEFAULT_FILE_LIMIT;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const sampleFiles = options.sampleFiles ?? DEFAULT_SAMPLE_FILES;
  const sampleChars = options.sampleChars ?? DEFAULT_SAMPLE_CHARS;
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY;

  const code = clone.files.filter((path) => languageOf(path) !== null && !isSkipped(path));
  const tests = code.filter(isTestPath);
  const sources = code.filter((path) => !isTestPath(path));

  if (sources.length === 0) {
    return {
      ...emptyCodeFacts(['code_files_not_found']),
      sourceFiles: 0,
      testFiles: tests.length,
    };
  }

  // Выбор файлов моделью не зависит от чтения — пусть идут параллельно.
  const selection = options.selectFiles
    ? options.selectFiles(buildCatalog(code)).catch(() => [] as string[])
    : Promise.resolve([] as string[]);

  const errors: string[] = [];
  const { files: read, complete } = await readFilesFromClone(
    clone.repo,
    clone.index,
    sources.slice(0, fileLimit),
    { maxFileBytes, deadline },
  );
  if (!complete) errors.push('code_scan_partial');

  if (read.size === 0) {
    return {
      ...emptyCodeFacts(['code_files_unreadable']),
      sourceFiles: sources.length,
      testFiles: tests.length,
    };
  }

  const perFileLines: number[] = [];
  let totalLines = 0;
  let commentLines = 0;
  let todoHits = 0;

  for (const text of read.values()) {
    const lines = text.split('\n');
    perFileLines.push(lines.length);
    totalLines += lines.length;
    for (const line of lines) {
      if (COMMENT_LINE_RE.test(line)) commentLines += 1;
      if (TODO_RE.test(line)) todoHits += 1;
    }
  }

  const longFiles = perFileLines.filter((n) => n > LONG_FILE_LINES).length;
  const { sample, source } = await buildSample({
    clone,
    read,
    picked: await selection,
    sampleFiles,
    sampleChars,
    maxFileBytes,
    deadline,
  });

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
    scannedFiles: read.size,
    sampleSource: source,
    sample,
    errors,
  };
}

/** Структура проекта для первого прохода модели. */
export function buildCatalog(paths: string[]): CodeCatalogEntry[] {
  return paths.slice(0, CATALOG_LIMIT).map((path) => ({
    path,
    language: languageOf(path) ?? 'unknown',
    test: isTestPath(path),
  }));
}

// ---------- выборка для ревью ----------

async function buildSample(args: {
  clone: IndexedClone;
  read: Map<string, string>;
  picked: string[];
  sampleFiles: number;
  sampleChars: number;
  maxFileBytes: number;
  deadline: number;
}): Promise<{ sample: CodeSampleFile[]; source: CodeFacts['sampleSource'] }> {
  const { clone, read, picked, sampleFiles, sampleChars, maxFileBytes, deadline } = args;

  const chosen = picked.filter((path) => clone.index.has(path)).slice(0, sampleFiles);
  if (chosen.length > 0) {
    // Файлы, которых не было в метрическом проходе, дочитываем точечно.
    const missing = chosen.filter((path) => !read.has(path));
    if (missing.length > 0) {
      const extra = await readFilesFromClone(clone.repo, clone.index, missing, {
        maxFileBytes,
        deadline,
      });
      for (const [path, text] of extra.files) read.set(path, text);
    }

    const sample = chosen
      .map((path) => toSampleFile(path, read.get(path), sampleChars))
      .filter((file): file is CodeSampleFile => file !== null);
    if (sample.length > 0) return { sample, source: 'model' };
  }

  // Запасной вариант: самые крупные из прочитанных.
  const sample = [...read.entries()]
    .map(([path, text]) => ({ path, lines: text.split('\n').length, text }))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, sampleFiles)
    .map((file) => ({
      path: file.path,
      lines: file.lines,
      excerpt: file.text.slice(0, sampleChars),
    }));

  return { sample, source: sample.length > 0 ? 'size' : 'none' };
}

function toSampleFile(
  path: string,
  text: string | undefined,
  sampleChars: number,
): CodeSampleFile | null {
  if (text === undefined) return null;
  return { path, lines: text.split('\n').length, excerpt: text.slice(0, sampleChars) };
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
