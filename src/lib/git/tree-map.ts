// Карта каталогов репозитория: что здесь вообще лежит и что из этого читать.
//
// Зачем. Раньше файлы для метрик и для показа модели брались срезом списка —
// то есть по алфавиту. На монорепозитории (divkit: 17 тысяч файлов) это
// означало «прочитали client/android и остановились»: ни Swift, ни веб, ни
// ядро в выборку не попадали, а модель выбирала файлы из одной папки.
//
// Здесь два инструмента:
//   censusDirectories — перепись каталогов: сколько файлов, на каких языках,
//                       и не мусорный ли это каталог;
//   spreadPick        — выбор файлов по кругу, каталог за каталогом, чтобы
//                       лимит чтения разошёлся по всему проекту.
//
// Правило про «игнорировать большие папки» сознательно мягкое: каталог с
// кодом не выбрасывается никогда, даже если он огромный — он просто получает
// свою долю в общем круге. Выбрасываются только заведомо не-исходники:
// переводы, снапшоты, тестовые данные, картинки. Иначе легко потерять как раз
// то, ради чего анализ и затевался.

import { languageOf } from './languages';

export type DirStat = {
  /** Каталог до глубины DEPTH, либо «.» для файлов в корне. */
  dir: string;
  files: number;
  /** Языки каталога, от частого к редкому, не более трёх. */
  languages: string[];
  /** Каталог исключён из выборки. */
  skipped: boolean;
  /** Почему исключён — попадает в отчёт и в промпт модели. */
  reason?: string;
};

/** До какой глубины группируем: «client/android», «src/components». */
const DEPTH = 2;
/** Каталог считается большим, начиная с этого числа файлов. */
const BIG_DIR_FILES = 120;

/**
 * Имена каталогов, которые почти никогда не содержат кода проекта.
 * Сравнение по любому сегменту пути, в нижнем регистре.
 */
const NON_CODE_DIR_NAMES = new Set([
  'locale',
  'locales',
  'i18n',
  'intl',
  'translations',
  'lang',
  'langs',
  'testdata',
  'test-data',
  'fixtures',
  '__fixtures__',
  'snapshots',
  '__snapshots__',
  'mocks',
  '__mocks__',
  'assets',
  'images',
  'img',
  'icons',
  'fonts',
  'media',
  'data',
  'datasets',
  'samples',
  'schemas',
  'protos',
  'proto',
]);

/**
 * Перепись каталогов. На вход — пути файлов с кодом (уже отфильтрованные по
 * расширению), на выход — что где лежит и что мы из этого возьмём.
 */
export function censusDirectories(paths: string[], depth = DEPTH): DirStat[] {
  const groups = new Map<string, string[]>();
  for (const path of paths) {
    const dir = dirKey(path, depth);
    const list = groups.get(dir);
    if (list) list.push(path);
    else groups.set(dir, [path]);
  }

  const stats: DirStat[] = [];
  for (const [dir, files] of groups) {
    const languages = topLanguages(files);
    const skip = shouldSkipDirectory(dir, files, languages);
    stats.push({ dir, files: files.length, languages, ...skip });
  }

  // От большого к маленькому: так перепись читается и человеком, и моделью.
  return stats.sort((a, b) => b.files - a.files || a.dir.localeCompare(b.dir));
}

/**
 * Выбирает до `limit` файлов, обходя каталоги по кругу. Большой каталог не
 * вытесняет остальные: за один круг каждый отдаёт по одному файлу.
 */
export function spreadPick(paths: string[], limit: number, depth = DEPTH): string[] {
  if (paths.length <= limit) return [...paths];

  const groups = new Map<string, string[]>();
  for (const path of paths) {
    const dir = dirKey(path, depth);
    const list = groups.get(dir);
    if (list) list.push(path);
    else groups.set(dir, [path]);
  }

  // Каталоги берём от большого к маленькому — у крупных больше шансов
  // оказаться основным кодом, и в первом же круге они дадут свой файл.
  const buckets = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([, files]) => files);

  const picked: string[] = [];
  let round = 0;
  while (picked.length < limit) {
    let tookSomething = false;
    for (const bucket of buckets) {
      const file = bucket[round];
      if (file === undefined) continue;
      picked.push(file);
      tookSomething = true;
      if (picked.length >= limit) break;
    }
    if (!tookSomething) break;
    round += 1;
  }

  return picked;
}

/** Пути каталогов, исключённых переписью. */
export function skippedDirectories(stats: DirStat[]): DirStat[] {
  return stats.filter((s) => s.skipped);
}

/** Отфильтровывает файлы из исключённых каталогов. */
export function withoutSkipped(paths: string[], stats: DirStat[], depth = DEPTH): string[] {
  const skipped = new Set(stats.filter((s) => s.skipped).map((s) => s.dir));
  if (skipped.size === 0) return paths;
  return paths.filter((path) => !skipped.has(dirKey(path, depth)));
}

// ---------- helpers ----------

function dirKey(path: string, depth: number): string {
  const parts = path.split('/');
  if (parts.length <= 1) return '.';
  return parts.slice(0, Math.min(depth, parts.length - 1)).join('/');
}

function topLanguages(files: string[]): string[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const lang = languageOf(file);
    if (!lang) continue;
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
}

/**
 * Исключаем каталог, только если он одновременно большой и заведомо не про
 * код: переводы, снапшоты, данные. Большой каталог с кодом остаётся — он
 * просто делит лимит чтения с остальными.
 */
function shouldSkipDirectory(
  dir: string,
  files: string[],
  languages: string[],
): { skipped: boolean; reason?: string } {
  const segments = dir.toLowerCase().split('/');
  const nonCodeName = segments.find((segment) => NON_CODE_DIR_NAMES.has(segment));
  if (nonCodeName) {
    return { skipped: true, reason: `каталог «${nonCodeName}» — не исходники` };
  }

  // Однотипная гора файлов без единого узнаваемого языка: сгенерированное
  // или данные под видом кода.
  if (files.length >= BIG_DIR_FILES && languages.length === 0) {
    return { skipped: true, reason: `${files.length} файлов без узнаваемого языка` };
  }

  return { skipped: false };
}
