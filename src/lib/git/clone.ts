// Shallow-клон репозитория через isomorphic-git — чистый JS, без бинарника git.
//
// Почему не `git clone`: в serverless-функциях Vercel нет исполняемого git,
// а история коммитов, README и lock-файлы берутся только из репозитория —
// в API SourceCraft нет ни эндпоинта файлов, ни эндпоинта коммитов.
//
// Тянем узкий срез: одна ветка, без рабочей копии, история за окно в 90 дней —
// это быстро даже на большом репозитории. Полная история нужна только дереву
// пути создания, поэтому она добирается отдельно (`deepenClone`) и только если
// на неё осталось время: раньше неудачная попытка скачать две тысячи коммитов
// съедала две минуты бюджета до того, как начиналось хоть какое-то чтение.
//
// Клон живёт в /tmp и удаляется сразу после использования: постоянного диска
// нет ни на Vercel, ни в воркере.
//
// Использование:
//   await withRepoClone({ cloneUrlHttps, token }, async (repo) => {
//     const readme = await readFileFromClone(repo, 'README.md');
//   });

import fs from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

export type RepoClone = {
  /** Каталог клона в /tmp. */
  dir: string;
  /** Коммит, на который смотрит HEAD. */
  headOid: string;
  /** Клон обрезанный: полное число коммитов по нему считать нельзя. */
  shallow: boolean;
  /** В клоне только верхушка: истории нет совсем, есть файлы. */
  tipOnly: boolean;
  /**
   * Общий кэш isomorphic-git. Без него каждый вызов заново разбирает индекс
   * pack-файла: на репозитории в семнадцать тысяч файлов обход дерева от
   * этого растягивался с секунд до минут.
   */
  cache: object;
  /** Откуда клонировали — нужно, чтобы дотянуть историю позже. */
  source: { cloneUrlHttps: string; token?: string };
};

export type CloneOptions = {
  cloneUrlHttps: string;
  token?: string;
  /** Окно истории в днях. 0 или меньше — тянуть всю историю сразу. */
  historyDays?: number;
  /**
   * Что качаем: `window` — историю за окно (по ней считается активность),
   * `tip` — только последний снимок файлов. Для большого репозитория окно
   * не доедет, а файлы нужны всем метрикам кода.
   */
  strategy?: 'window' | 'tip';
  /** Лимит на одну попытку клона. */
  timeoutMs?: number;
  /** Общий лимит на все попытки: вторая не начнётся, если времени не осталось. */
  totalTimeoutMs?: number;
};

const DEFAULT_HISTORY_DAYS = 90;
/** Лимит одной попытки. Две попытки должны уложиться в бюджет сбора. */
const DEFAULT_CLONE_TIMEOUT_MS = 90_000;
const DEFAULT_CLONE_TOTAL_TIMEOUT_MS = 150_000;
/** Потолок на историю: и страховка от deepen-since, и предел глубины клона. */
const MAX_DEPTH = 2_000;
/** Сколько ждём добор полной истории, если на него осталось время. */
const DEFAULT_DEEPEN_TIMEOUT_MS = 60_000;
/** Сколько блобов читаем одновременно при пакетном чтении. */
const DEFAULT_READ_CONCURRENCY = 16;
/** Файлы крупнее этого не читаем: это данные или собранные бандлы. */
const DEFAULT_MAX_FILE_BYTES = 200 * 1024;
/** Меньше этого остатка вторую попытку клона не начинаем. */
const MIN_RETRY_MS = 25_000;

export async function withRepoClone<T>(
  options: CloneOptions,
  fn: (repo: RepoClone) => Promise<T>,
): Promise<T> {
  const historyDays = options.historyDays ?? DEFAULT_HISTORY_DAYS;
  const attemptMs = options.timeoutMs ?? DEFAULT_CLONE_TIMEOUT_MS;
  const totalDeadline = Date.now() + (options.totalTimeoutMs ?? DEFAULT_CLONE_TOTAL_TIMEOUT_MS);
  const dir = await mkdtemp(join(tmpdir(), 'pulse-git-'));

  try {
    // На большом монорепозитории (divkit — 17 тысяч файлов, gravity-ui)
    // клон с историей не доезжает: даже окно в 90 дней тянет весь снимок
    // файлов, а сверху ещё и коммиты. Поэтому крупные репозитории сразу
    // качаются верхушкой: истории не будет, зато будут файлы, без которых
    // категория «Код» не стоит ничего.
    let tipOnly = options.strategy === 'tip';
    try {
      await cloneInto(dir, options, tipOnly ? { depth: 1 } : { historyDays }, attemptMs);
    } catch (err) {
      const leftMs = totalDeadline - Date.now();
      if (tipOnly || leftMs < MIN_RETRY_MS) throw err;
      console.warn(
        `[git] клон с историей не вышел (${describe(err)}); пробуем только верхушку`,
      );
      // Каталог после неудачи может быть занят половиной пачки — чистим.
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      await cloneInto(dir, options, { depth: 1 }, leftMs);
      tipOnly = true;
    }

    const cache = {};
    const headOid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
    return await fn({
      dir,
      headOid,
      shallow: true,
      tipOnly,
      cache,
      source: { cloneUrlHttps: options.cloneUrlHttps, token: options.token },
    });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {
      // мусор в /tmp — не повод ронять анализ
    });
  }
}

/**
 * Дотягивает историю до MAX_DEPTH коммитов в уже открытом клоне.
 * Возвращает true, если получилось. Неудача не страшна: дерево пути просто
 * останется обрезанным, а всё остальное уже прочитано.
 */
export async function deepenClone(
  repo: RepoClone,
  options: { depth?: number; timeoutMs?: number } = {},
): Promise<boolean> {
  try {
    await withTimeout(
      git.fetch({
        fs,
        http,
        dir: repo.dir,
        cache: repo.cache,
        url: normalizeCloneUrl(repo.source.cloneUrlHttps),
        singleBranch: true,
        depth: options.depth ?? MAX_DEPTH,
        onAuth: repo.source.token
          ? () => ({ username: 'x-access-token', password: repo.source.token })
          : undefined,
      }),
      options.timeoutMs ?? DEFAULT_DEEPEN_TIMEOUT_MS,
      'deepen_timeout',
    );
    repo.shallow = false;
    return true;
  } catch (err) {
    console.warn(`[git] историю целиком добрать не удалось (${describe(err)})`);
    return false;
  }
}

/** Одна попытка клона: либо на глубину, либо за окно в днях. */
async function cloneInto(
  dir: string,
  options: CloneOptions,
  window: { depth: number } | { historyDays: number },
  timeoutMs?: number,
): Promise<void> {
  await withTimeout(
    git.clone({
      fs,
      http,
      dir,
      url: normalizeCloneUrl(options.cloneUrlHttps),
      singleBranch: true,
      // Рабочая копия не нужна: файлы читаем прямо из объектов.
      noCheckout: true,
      ...('depth' in window
        ? { depth: window.depth }
        : { since: new Date(Date.now() - window.historyDays * 24 * 3600 * 1000) }),
      onAuth: options.token
        ? () => ({ username: 'x-access-token', password: options.token })
        : undefined,
    }),
    timeoutMs ?? options.timeoutMs ?? DEFAULT_CLONE_TIMEOUT_MS,
    'clone_timeout',
  );
}


function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Содержимое файла на HEAD. Null, если файла нет или он не читается. */
export async function readFileFromClone(
  repo: RepoClone,
  filepath: string,
): Promise<string | null> {
  try {
    const { blob } = await git.readBlob({
      fs,
      dir: repo.dir,
      oid: repo.headOid,
      filepath,
      cache: repo.cache,
    });
    return Buffer.from(blob).toString('utf8');
  } catch {
    return null;
  }
}

/** Пути всех файлов на HEAD. */
export async function listFilesInClone(repo: RepoClone): Promise<string[]> {
  try {
    return await git.listFiles({ fs, dir: repo.dir, ref: repo.headOid, cache: repo.cache });
  } catch {
    return [];
  }
}

/** Клон с готовым индексом файлов — то, с чем работают сборщики фактов. */
export type IndexedClone = { repo: RepoClone; index: CloneFileIndex; files: string[] };

export async function openIndexedClone(repo: RepoClone): Promise<IndexedClone> {
  const index = await indexCloneFiles(repo);
  // Индекс строится одним обходом дерева, поэтому отдельный listFiles не нужен.
  const files = index.size > 0 ? [...index.keys()].sort() : await listFilesInClone(repo);
  return { repo, index, files };
}


// ---------- Быстрое чтение файлов ----------
//
// `readFileFromClone` удобен для одиночного файла, но на сотне файлов он
// становится узким местом: каждый вызов заново идёт от коммита по дереву.
// Для пакетного чтения сначала строим индекс путь→oid одним обходом, а потом
// читаем блобы по oid, пачками.

/** Путь файла на HEAD → oid его блоба. */
export type CloneFileIndex = Map<string, string>;

export async function indexCloneFiles(repo: RepoClone): Promise<CloneFileIndex> {
  const index: CloneFileIndex = new Map();
  try {
    const { commit } = await git.readCommit({ fs, dir: repo.dir, oid: repo.headOid, cache: repo.cache });
    // Обходим деревья сами: так мы получаем oid каждого блоба разом и дальше
    // читаем файлы напрямую, не проходя путь от коммита на каждый файл.
    const stack: Array<{ oid: string; prefix: string }> = [{ oid: commit.tree, prefix: '' }];

    while (stack.length > 0) {
      const node = stack.pop()!;
      const { tree } = await git.readTree({ fs, dir: repo.dir, oid: node.oid, cache: repo.cache });
      for (const entry of tree) {
        const path = node.prefix ? `${node.prefix}/${entry.path}` : entry.path;
        if (entry.type === 'tree') stack.push({ oid: entry.oid, prefix: path });
        else if (entry.type === 'blob') index.set(path, entry.oid);
      }
    }
  } catch {
    // Дерево не прочиталось — отдаём пустой индекс, вызывающий разберётся.
  }
  return index;
}

/** Содержимое блоба по oid. Null — если объект не читается. */
export async function readBlobByOid(repo: RepoClone, oid: string): Promise<Buffer | null> {
  try {
    const { blob } = await git.readBlob({ fs, dir: repo.dir, oid, cache: repo.cache });
    return Buffer.from(blob);
  } catch {
    return null;
  }
}

export type BatchReadOptions = {
  /** Сколько блобов читаем одновременно. */
  concurrency?: number;
  /** Файлы крупнее пропускаем, не декодируя. */
  maxFileBytes?: number;
  /** Момент времени, после которого чтение прекращается. */
  deadline?: number;
};

export type BatchReadResult = {
  files: Map<string, string>;
  /** Дочитали ли до конца списка. */
  complete: boolean;
};

/**
 * Читает файлы пачками. Возвращает то, что успело прочитаться: чтение
 * прекращается по дедлайну, а не тянет анализ за собой.
 */
export async function readFilesFromClone(
  repo: RepoClone,
  index: CloneFileIndex,
  paths: string[],
  options: BatchReadOptions = {},
): Promise<BatchReadResult> {
  const concurrency = options.concurrency ?? DEFAULT_READ_CONCURRENCY;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY;

  const files = new Map<string, string>();
  let cursor = 0;
  let stopped = false;

  async function worker(): Promise<void> {
    for (;;) {
      if (stopped || Date.now() > deadline) {
        stopped = true;
        return;
      }
      const i = cursor;
      cursor += 1;
      const path = paths[i];
      if (path === undefined) return;

      const oid = index.get(path);
      if (!oid) continue;
      const blob = await readBlobByOid(repo, oid);
      if (!blob || blob.length > maxFileBytes) continue;
      files.set(path, blob.toString('utf8'));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, worker));
  return { files, complete: !stopped && cursor >= paths.length };
}

/**
 * Клон-URL SourceCraft приходит в виде `https://git@git.sourcecraft.dev/...`.
 * isomorphic-git имя пользователя в URL не принимает — авторизуемся через onAuth.
 */
function normalizeCloneUrl(cloneUrl: string): string {
  try {
    const url = new URL(cloneUrl);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return cloneUrl;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, tag: string): Promise<T> {
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error(tag)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      },
      (err) => {
        clearTimeout(timer);
        rejectPromise(err);
      },
    );
  });
}
