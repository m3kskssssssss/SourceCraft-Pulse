// Shallow-клон репозитория через isomorphic-git — чистый JS, без бинарника git.
//
// Почему не `git clone`: в serverless-функциях Vercel нет исполняемого git,
// а история коммитов, README и lock-файлы берутся только из репозитория —
// в API SourceCraft нет ни эндпоинта файлов, ни эндпоинта коммитов.
//
// Тянем узкий срез: одна ветка, без рабочей копии, история — за окно, которое
// считает движок оценки (90 дней). Клон живёт в /tmp и удаляется сразу после
// использования: постоянного диска нет ни на Vercel, ни в воркере.
//
// Использование:
//   await withRepoClone({ cloneUrlHttps, token }, async (repo) => {
//     const readme = await readFileFromClone(repo, 'README.md');
//   });

import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
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
  /** Окно истории в днях. 0 или меньше — тянуть всю историю. */
  historyDays?: number;
  /** Лимит на весь клон. */
  timeoutMs?: number;
};

const DEFAULT_HISTORY_DAYS = 90;
const DEFAULT_CLONE_TIMEOUT_MS = 120_000;
/** Страховка на случай, если сервер проигнорирует deepen-since. */
const MAX_DEPTH = 2_000;

export async function withRepoClone<T>(
  options: CloneOptions,
  fn: (repo: RepoClone) => Promise<T>,
): Promise<T> {
  const historyDays = options.historyDays ?? DEFAULT_HISTORY_DAYS;
  const dir = await mkdtemp(join(tmpdir(), 'pulse-git-'));

  try {
    const shallow = historyDays > 0;
    await withTimeout(
      git.clone({
        fs,
        http,
        dir,
        url: normalizeCloneUrl(options.cloneUrlHttps),
        singleBranch: true,
        // Рабочая копия не нужна: файлы читаем прямо из объектов.
        noCheckout: true,
        ...(shallow
          ? { since: new Date(Date.now() - historyDays * 24 * 3600 * 1000) }
          : { depth: MAX_DEPTH }),
        onAuth: options.token
          ? () => ({ username: 'x-access-token', password: options.token })
          : undefined,
      }),
      options.timeoutMs ?? DEFAULT_CLONE_TIMEOUT_MS,
      'clone_timeout',
    );

    const headOid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
    return await fn({ dir, headOid, shallow });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {
      // мусор в /tmp — не повод ронять анализ
    });
  }
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
