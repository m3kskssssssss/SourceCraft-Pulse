// Определение языков репозитория по составу файлов.
//
// Зачем, если у API SourceCraft есть `language`: это поле приходит далеко не
// всегда (у части репозиториев его просто нет), а в рейтинге тогда висит
// «язык не определён». Состав файлов — честный второй источник.
//
// Считаем файлы, а не строки: строки требуют чтения каждого блоба, а разница
// для определения основного языка невелика.

const EXTENSION_LANGUAGES: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  mts: 'TypeScript',
  cts: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  py: 'Python',
  rb: 'Ruby',
  php: 'PHP',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  kt: 'Kotlin',
  kts: 'Kotlin',
  scala: 'Scala',
  swift: 'Swift',
  m: 'Objective-C',
  mm: 'Objective-C',
  c: 'C',
  h: 'C',
  cc: 'C++',
  cpp: 'C++',
  cxx: 'C++',
  hpp: 'C++',
  hh: 'C++',
  cs: 'C#',
  fs: 'F#',
  dart: 'Dart',
  ex: 'Elixir',
  exs: 'Elixir',
  erl: 'Erlang',
  hs: 'Haskell',
  lua: 'Lua',
  pl: 'Perl',
  pm: 'Perl',
  r: 'R',
  jl: 'Julia',
  zig: 'Zig',
  nim: 'Nim',
  clj: 'Clojure',
  groovy: 'Groovy',
  vue: 'Vue',
  svelte: 'Svelte',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  ps1: 'PowerShell',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'SCSS',
  less: 'Less',
  html: 'HTML',
  htm: 'HTML',
  tf: 'Terraform',
};

/** Пути, которые не характеризуют проект: чужой код и сборка. */
const IGNORED_PATH_PARTS = [
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
  '.gen.',
  '.min.',
  'fixtures/',
  'testdata/',
];

export type LanguageShare = {
  name: string;
  files: number;
  /** Доля от всех опознанных файлов, 0..100 с одним знаком. */
  sharePercent: number;
};

/**
 * Раскладка по языкам, от самого частого к редкому.
 * Пустой массив — ни одного опознанного файла.
 */
export function detectLanguages(paths: string[], limit = 6): LanguageShare[] {
  const counts = new Map<string, number>();
  let recognized = 0;

  for (const path of paths) {
    if (isIgnored(path)) continue;
    const language = languageOf(path);
    if (!language) continue;
    counts.set(language, (counts.get(language) ?? 0) + 1);
    recognized += 1;
  }

  if (recognized === 0) return [];

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, files]) => ({
      name,
      files,
      sharePercent: Math.round((files / recognized) * 1000) / 10,
    }));
}

/** Основной язык — самый частый. Null, если опознать нечего. */
export function detectPrimaryLanguage(paths: string[]): string | null {
  return detectLanguages(paths, 1)[0]?.name ?? null;
}

export function languageOf(path: string): string | null {
  const dot = path.lastIndexOf('.');
  if (dot < 0 || dot === path.length - 1) return null;
  const ext = path.slice(dot + 1).toLowerCase();
  return EXTENSION_LANGUAGES[ext] ?? null;
}

function isIgnored(path: string): boolean {
  const lower = path.toLowerCase();
  return IGNORED_PATH_PARTS.some((part) => lower.includes(part));
}
