// Правки файлов, которые предлагает ИИ, и их показ владельцу.
//
// Модель не переписывает файлы кода целиком: так она обрезает их и молча
// «улучшает» соседний код. Она присылает блоки «найти → заменить», и мы
// применяем их механически: фрагмент должен встретиться в файле ровно один
// раз. Не сошёлся хоть один блок — вся правка файла отбрасывается, потому что
// половина исправления хуже, чем никакого.
//
// Чистые функции без БД, сети и git — ради Vitest-теста.

export type SearchReplace = { search: string; replace: string };

export type ApplyResult =
  | { ok: true; content: string }
  | { ok: false; reason: string };

/** Применяет блоки по очереди к тексту с переводами строк LF. */
export function applySearchReplace(content: string, edits: SearchReplace[]): ApplyResult {
  let text = content;
  for (const [index, edit] of edits.entries()) {
    const search = toLf(edit.search);
    const replace = toLf(edit.replace);
    if (search.length === 0) return { ok: false, reason: `блок ${index + 1}: пустой фрагмент для поиска` };
    const first = text.indexOf(search);
    if (first < 0) return { ok: false, reason: `блок ${index + 1}: фрагмент не найден в файле` };
    if (text.indexOf(search, first + 1) >= 0) {
      return { ok: false, reason: `блок ${index + 1}: фрагмент встречается в файле несколько раз` };
    }
    text = text.slice(0, first) + replace + text.slice(first + search.length);
  }
  if (text === content) return { ok: false, reason: 'правка ничего не меняет' };
  return { ok: true, content: text };
}

// ---------- Переводы строк ----------

export function toLf(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

/** CRLF, если им заканчивается большинство строк файла. */
export function detectEol(text: string): '\n' | '\r\n' {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/\n/g) ?? []).length;
  return crlf > 0 && crlf * 2 >= lf ? '\r\n' : '\n';
}

/** Возвращает файлу его родной перевод строк после правки в LF. */
export function withEol(text: string, eol: '\n' | '\r\n'): string {
  const lf = toLf(text);
  return eol === '\r\n' ? lf.replace(/\n/g, '\r\n') : lf;
}

// ---------- Куда писать нельзя ----------

const FORBIDDEN_NAMES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'cargo.lock',
  'go.sum',
  'poetry.lock',
  'pipfile.lock',
  'composer.lock',
  'gemfile.lock',
]);

/**
 * Можно ли предлагать правку по этому пути. Запрещены: выход из репозитория,
 * служебные каталоги git, лок-файлы (без установки зависимостей их не
 * обновить честно), конфиги CI (их формат на SourceCraft нам неизвестен),
 * файлы окружения с секретами и бинарные по расширению.
 */
export function isEditablePath(path: string): boolean {
  if (!path || path.length > 300) return false;
  if (path.startsWith('/') || path.includes('\\') || path.includes('\0')) return false;
  const parts = path.split('/');
  if (parts.some((p) => p === '' || p === '.' || p === '..')) return false;
  const lower = path.toLowerCase();
  if (parts[0] === '.git' || lower.startsWith('.github/') || lower.startsWith('.sourcecraft/')) return false;
  if (lower === '.gitlab-ci.yml' || lower.startsWith('.gitlab/')) return false;
  const name = parts[parts.length - 1]!.toLowerCase();
  if (FORBIDDEN_NAMES.has(name)) return false;
  if (name === '.env' || (name.startsWith('.env.') && name !== '.env.example')) return false;
  if (/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|jar|exe|dll|so|dylib|bin|woff2?|ttf|mp[34]|wasm)$/i.test(name)) {
    return false;
  }
  return true;
}

// ---------- Дифф для превью ----------

export type DiffLine =
  | { t: 'ctx' | 'add' | 'del'; text: string }
  | { t: 'gap'; skipped: number };

/** Больше клеток таблицы LCS не считаем — показываем файл как заменённый целиком. */
const LCS_CELL_LIMIT = 4_000_000;
/** Сколько неизменных строк оставлять вокруг правки. */
const CONTEXT = 3;
/** Сколько строк диффа хранить на файл: превью, а не весь файл. */
const MAX_DIFF_LINES = 800;

export type LineDiff = { lines: DiffLine[]; added: number; removed: number; truncated: boolean };

/** Построчный дифф с тремя строками контекста вокруг каждой правки. */
export function lineDiff(before: string, after: string): LineDiff {
  const a = splitLines(before);
  const b = splitLines(after);
  const ops = a.length * b.length > LCS_CELL_LIMIT ? replaceAll(a, b) : lcsOps(a, b);

  const added = ops.filter((o) => o.t === 'add').length;
  const removed = ops.filter((o) => o.t === 'del').length;

  // Оставляем контекст вокруг изменённых строк, остальное схлопываем.
  const keep = new Array<boolean>(ops.length).fill(false);
  ops.forEach((op, i) => {
    if (op.t === 'ctx') return;
    for (let j = Math.max(0, i - CONTEXT); j <= Math.min(ops.length - 1, i + CONTEXT); j += 1) keep[j] = true;
  });

  const lines: DiffLine[] = [];
  let skipped = 0;
  for (const [i, op] of ops.entries()) {
    if (keep[i]) {
      if (skipped > 0) lines.push({ t: 'gap', skipped });
      skipped = 0;
      lines.push(op);
    } else {
      skipped += 1;
    }
  }
  if (skipped > 0 && lines.length > 0) lines.push({ t: 'gap', skipped });

  const truncated = lines.length > MAX_DIFF_LINES;
  return { lines: truncated ? lines.slice(0, MAX_DIFF_LINES) : lines, added, removed, truncated };
}

type Op = { t: 'ctx' | 'add' | 'del'; text: string };

function splitLines(text: string): string[] {
  const lf = toLf(text);
  if (lf === '') return [];
  const lines = lf.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function replaceAll(a: string[], b: string[]): Op[] {
  return [...a.map((text) => ({ t: 'del' as const, text })), ...b.map((text) => ({ t: 'add' as const, text }))];
}

/** Классическая таблица наибольшей общей подпоследовательности строк. */
function lcsOps(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  // table[i][j] — длина LCS суффиксов a[i:] и b[j:], одной плоской строкой.
  const table = new Uint32Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[at(i, j)] =
        a[i] === b[j] ? table[at(i + 1, j + 1)]! + 1 : Math.max(table[at(i + 1, j)]!, table[at(i, j + 1)]!);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ t: 'ctx', text: a[i]! });
      i += 1;
      j += 1;
    } else if (table[at(i + 1, j)]! >= table[at(i, j + 1)]!) {
      ops.push({ t: 'del', text: a[i]! });
      i += 1;
    } else {
      ops.push({ t: 'add', text: b[j]! });
      j += 1;
    }
  }
  while (i < n) ops.push({ t: 'del', text: a[i++]! });
  while (j < m) ops.push({ t: 'add', text: b[j++]! });
  return ops;
}
