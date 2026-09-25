// Создание pull request с улучшениями на SourceCraft.
//
// В API SourceCraft нет эндпоинта «записать файл», поэтому ветку готовим сами
// через isomorphic-git (бинарника git в serverless нет):
//   1) облегчённый клон одной ветки: depth 1, без рабочей копии;
//   2) новые файлы добавляем прямо в дерево последнего коммита — без
//      checkout, поэтому остальные файлы репозитория остаются как были;
//      файл, который уже есть, не трогаем;
//   3) коммит в новую ветку pulse/improvements-…, push с токеном пользователя;
//   4) сам PR — POST /repos/{org}/{repo}/pulls тем же токеном, автором
//      становится владелец токена.
//
// Клон живёт в /tmp и удаляется в finally.

import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { SourcecraftClient } from '../sourcecraft/client';
import type { ImprovementFile } from './plan';

export class PullRequestError extends Error {
  constructor(
    message: string,
    /** Где сломалось — для текста пользователю. */
    public readonly stage: 'clone' | 'nothing' | 'push' | 'pr',
  ) {
    super(message);
    this.name = 'PullRequestError';
  }
}

export type CreatePrInput = {
  org: string;
  repo: string;
  defaultBranch: string;
  token: string;
  author: { name: string; email: string };
  files: ImprovementFile[];
  title: string;
  description: string;
};

export type CreatePrResult = {
  branch: string;
  /** Номер PR в SourceCraft. */
  slug: string | null;
  addedPaths: string[];
  /** Файлы, которые уже появились в репозитории после анализа: их не трогали. */
  skippedPaths: string[];
};

const CLONE_TIMEOUT_MS = 90_000;

export async function createImprovementPullRequest(input: CreatePrInput): Promise<CreatePrResult> {
  const url = `https://git.sourcecraft.dev/${encodeURIComponent(input.org)}/${encodeURIComponent(input.repo)}.git`;
  // Имя пользователя в git-запросах SourceCraft не проверяет — важен токен.
  const onAuth = () => ({ username: 'x-access-token', password: input.token });
  const dir = await mkdtemp(join(tmpdir(), 'pulse-pr-'));
  const cache = {};

  try {
    try {
      await withTimeout(
        git.clone({
          fs,
          http,
          dir,
          url,
          ref: input.defaultBranch,
          singleBranch: true,
          depth: 1,
          noCheckout: true,
          noTags: true,
          onAuth,
          cache,
        }),
        CLONE_TIMEOUT_MS,
      );
    } catch (err) {
      throw new PullRequestError(`не удалось скачать репозиторий: ${describe(err)}`, 'clone');
    }

    const headOid = await git.resolveRef({ fs, dir, ref: `refs/heads/${input.defaultBranch}` });
    const head = await git.readCommit({ fs, dir, oid: headOid, cache });

    const addedPaths: string[] = [];
    const skippedPaths: string[] = [];
    let tree = head.commit.tree;
    for (const file of input.files) {
      const blob = await git.writeBlob({ fs, dir, blob: Buffer.from(file.content, 'utf8') });
      const next = await putFile(dir, cache, tree, file.path.split('/'), blob);
      if (next === null) {
        skippedPaths.push(file.path);
      } else {
        tree = next;
        addedPaths.push(file.path);
      }
    }
    if (addedPaths.length === 0) {
      throw new PullRequestError('все предложенные файлы уже есть в репозитории', 'nothing');
    }

    const now = Math.floor(Date.now() / 1000);
    const person = { ...input.author, timestamp: now, timezoneOffset: 0 };
    const commitOid = await git.writeCommit({
      fs,
      dir,
      commit: {
        message: `${input.title}\n\nПредложено Pulse: ${addedPaths.join(', ')}\n`,
        tree,
        parent: [headOid],
        author: person,
        committer: person,
      },
    });

    const branch = `pulse/improvements-${stamp(new Date())}`;
    await git.writeRef({ fs, dir, ref: `refs/heads/${branch}`, value: commitOid });

    try {
      const result = await git.push({
        fs,
        http,
        dir,
        url,
        ref: branch,
        remoteRef: `refs/heads/${branch}`,
        onAuth,
      });
      if (!result.ok) throw new Error(result.error ?? 'push отклонён');
    } catch (err) {
      throw new PullRequestError(
        `SourceCraft не принял ветку: ${describe(err)}. Проверьте, что у токена есть право создавать ветки (роль developer или выше).`,
        'push',
      );
    }

    let slug: string | null = null;
    try {
      const client = new SourcecraftClient({ token: input.token });
      const pr = await client.createPullRequest(input.org, input.repo, {
        title: input.title,
        description: input.description,
        source_branch: branch,
        target_branch: input.defaultBranch,
        publish: true,
      });
      slug = pr.slug ?? null;
    } catch (err) {
      throw new PullRequestError(
        `ветка ${branch} отправлена, но PR не создался: ${describe(err)}. Его можно открыть из этой ветки вручную.`,
        'pr',
      );
    }

    return { branch, slug, addedPaths, skippedPaths };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Кладёт blob по пути внутрь дерева и возвращает oid нового дерева.
 * null — по этому пути уже что-то есть: существующее не перезаписываем.
 */
async function putFile(
  dir: string,
  cache: object,
  treeOid: string | null,
  parts: string[],
  blobOid: string,
): Promise<string | null> {
  const [name, ...rest] = parts;
  if (!name) return null;
  const entries = treeOid ? (await git.readTree({ fs, dir, oid: treeOid, cache })).tree : [];
  const existing = entries.find((e) => e.path === name);

  let entry: { mode: string; path: string; oid: string; type: 'blob' | 'tree' };
  if (rest.length === 0) {
    if (existing) return null;
    entry = { mode: '100644', path: name, oid: blobOid, type: 'blob' };
  } else {
    if (existing && existing.type !== 'tree') return null;
    const sub = await putFile(dir, cache, existing ? existing.oid : null, rest, blobOid);
    if (sub === null) return null;
    entry = { mode: '040000', path: name, oid: sub, type: 'tree' };
  }

  const next = entries.filter((e) => e.path !== name).concat(entry);
  return git.writeTree({ fs, dir, tree: next });
}

function stamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}-${p(date.getUTCHours())}${p(date.getUTCMinutes())}`;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`таймаут ${Math.round(ms / 1000)} с`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
