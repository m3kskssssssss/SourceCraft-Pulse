// Shallow-клон репозитория через isomorphic-git — чистый JS, без бинарника git.
//
// Почему не `git clone`: в serverless-функциях Vercel нет исполняемого git,
// а история коммитов, README и lock-файлы берутся только из репозитория —
// в API SourceCraft нет ни эндпоинта файлов, ни эндпоинта коммитов.
//
// Тянем узкий срез: одна ветка, без рабочей копии. Историю берём целиком, до
// MAX_DEPTH коммитов: по ней рисуется путь создания репозитория, а окно в 90
// дней движок оценки отрезает сам по датам. Клон живёт в /tmp и удаляется
// сразу после использования: постоянного диска нет ни на Vercel, ни в воркере.
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
};

export type CloneOptions = {
  cloneUrlHttps: string;
  token?: string;
  /** Окно истории в днях. 0 или меньше (по умолчанию) — тянуть всю историю. */
  historyDays?: number;
  /** Лимит на весь клон. */
  timeoutMs?: number;
};

const DEFAULT_HISTORY_DAYS = 0;
const DEFAULT_CLONE_TIMEOUT_MS = 120_000;
/** Потолок на историю: и страховка от deepen-since, и предел глубины клона. */
const MAX_DEPTH = 2_000;
/** Окно на вторую попытку, если полная история не скачалась. */
const FALLBACK_HISTORY_DAYS = 90;

export async function withRepoClone<T>(
  options: CloneOptions,
  fn: (repo: RepoClone) => Promise<T>,
): Promise<T> {
  const historyDays = options.historyDays ?? DEFAULT_HISTORY_DAYS;
  const dir = await mkdtemp(join(tmpdir(), 'pulse-git-'));

  try {
    // Полная история нужна дереву коммитов, но у большого репозитория пачка
    // на две тысячи коммитов бывает неподъёмной и сервер обрывает запрос.
    // Тогда откатываемся на окно, которого хватает движку оценки: лучше
    // короткий путь, чем анализ целиком без клона.
    let shallow = historyDays > 0;
    try {
      await cloneInto(dir, options, shallow ? { historyDays } : { depth: MAX_DEPTH });
    } catch (err) {
      if (shallow) throw err;
      console.warn(
        `[git] полная история не скачалась (${describe(err)}); берём ${FALLBACK_HISTORY_DAYS} дней`,
      );
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      await cloneInto(dir, options, { historyDays: FALLBACK_HISTORY_DAYS });
      shallow = true;
    }

    const headOid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
    return await fn({ dir, headOid, shallow });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {
      // мусор в /tmp — не повод ронять анализ
    });
  }
}

/** Одна попытка клона: либо на глубину, либо за окно в днях. */
async function cloneInto(
  dir: string,
  options: CloneOptions,
  window: { depth: number } | { historyDays: number },
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
    options.timeoutMs ?? DEFAULT_CLONE_TIMEOUT_MS,
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
    });
    return Buffer.from(blob).toString('utf8');
  } catch {
    return null;
  }
}

/** Пути всех файлов на HEAD. */
export async function listFilesInClone(repo: RepoClone): Promise<string[]> {
  try {
    return await git.listFiles({ fs, dir: repo.dir, ref: repo.headOid });
  } catch {
    return [];
  }
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
