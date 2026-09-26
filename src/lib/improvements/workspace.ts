// Клон репозитория для предложений: и подготовка правок, и сам PR работают с
// одной веткой по умолчанию, скачанной isomorphic-git в /tmp.
//
// Облегчённый клон: depth 1, без рабочей копии. Файлы читаем из объектов
// по пути, новые кладём прямо в дерево коммита — остальные файлы
// репозитория при этом остаются как были.

import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

const CLONE_TIMEOUT_MS = 90_000;
/** Больше этого текстовые файлы не читаем и не правим. */
const MAX_TEXT_BYTES = 200_000;

export type Workspace = {
  dir: string;
  url: string;
  cache: object;
  onAuth: () => { username: string; password: string };
  headOid: string;
  headTree: string;
  cleanup: () => Promise<void>;
};

export class WorkspaceCloneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceCloneError';
  }
}

export async function openWorkspace(input: {
  org: string;
  repo: string;
  branch: string;
  token: string;
}): Promise<Workspace> {
  const url = `https://git.sourcecraft.dev/${encodeURIComponent(input.org)}/${encodeURIComponent(input.repo)}.git`;
  // Имя пользователя в git-запросах SourceCraft не проверяет — важен токен.
  const onAuth = () => ({ username: 'x-access-token', password: input.token });
  const dir = await mkdtemp(join(tmpdir(), 'pulse-pr-'));
  const cache = {};
  const cleanup = () => rm(dir, { recursive: true, force: true }).catch(() => undefined);

  try {
    await withTimeout(
      git.clone({
        fs,
        http,
        dir,
        url,
        ref: input.branch,
        singleBranch: true,
        depth: 1,
        noCheckout: true,
        noTags: true,
        onAuth,
        cache,
      }),
      CLONE_TIMEOUT_MS,
    );
    const headOid = await git.resolveRef({ fs, dir, ref: `refs/heads/${input.branch}` });
    const head = await git.readCommit({ fs, dir, oid: headOid, cache });
    return { dir, url, cache, onAuth, headOid, headTree: head.commit.tree, cleanup };
  } catch (err) {
    await cleanup();
    throw new WorkspaceCloneError(`не удалось скачать репозиторий: ${describe(err)}`);
  }
}

/** Blob по пути в HEAD: oid и текст. null — файла нет; text null — бинарный или слишком большой. */
export async function readFileAt(
  ws: Workspace,
  path: string,
): Promise<{ oid: string; text: string | null } | null> {
  try {
    const { oid, blob } = await git.readBlob({ fs, dir: ws.dir, oid: ws.headOid, filepath: path, cache: ws.cache });
    if (blob.byteLength > MAX_TEXT_BYTES || blob.includes(0)) return { oid, text: null };
    return { oid, text: Buffer.from(blob).toString('utf8') };
  } catch {
    return null;
  }
}

export async function writeBlob(ws: Workspace, content: string): Promise<string> {
  return git.writeBlob({ fs, dir: ws.dir, blob: Buffer.from(content, 'utf8') });
}

/**
 * Кладёт blob по пути и возвращает oid нового дерева. Проверяет ожидание:
 *   - baseOid null — файла быть не должно (создаём новый);
 *   - baseOid строка — файл должен быть ровно этой версии (правим его).
 * Не совпало — `{ conflict }` с причиной: файл изменили после подготовки,
 * и накатывать на него старую правку нельзя.
 * Режим существующего файла сохраняется: исполняемый скрипт останется исполняемым.
 */
export async function putFile(
  ws: Workspace,
  treeOid: string,
  path: string,
  blobOid: string,
  baseOid: string | null,
): Promise<{ tree: string } | { conflict: string }> {
  return put(ws, treeOid, path.split('/'), blobOid, baseOid);
}

async function put(
  ws: Workspace,
  treeOid: string | null,
  parts: string[],
  blobOid: string,
  baseOid: string | null,
): Promise<{ tree: string } | { conflict: string }> {
  const [name, ...rest] = parts;
  if (!name) return { conflict: 'пустой путь' };
  const entries = treeOid ? (await git.readTree({ fs, dir: ws.dir, oid: treeOid, cache: ws.cache })).tree : [];
  const existing = entries.find((e) => e.path === name);

  let entry: { mode: string; path: string; oid: string; type: 'blob' | 'tree' };
  if (rest.length === 0) {
    if (baseOid === null && existing) return { conflict: 'файл уже появился в репозитории' };
    if (baseOid !== null) {
      if (!existing || existing.type !== 'blob') return { conflict: 'файл удалили из репозитория' };
      if (existing.oid !== baseOid) return { conflict: 'файл изменился после подготовки правок' };
    }
    entry = { mode: existing?.mode ?? '100644', path: name, oid: blobOid, type: 'blob' };
  } else {
    if (existing && existing.type !== 'tree') return { conflict: `${name} — файл, а не каталог` };
    const sub = await put(ws, existing ? existing.oid : null, rest, blobOid, baseOid);
    if ('conflict' in sub) return sub;
    entry = { mode: '040000', path: name, oid: sub.tree, type: 'tree' };
  }

  const next = entries.filter((e) => e.path !== name).concat(entry);
  return { tree: await git.writeTree({ fs, dir: ws.dir, tree: next }) };
}

export async function commitAndPush(
  ws: Workspace,
  input: { tree: string; message: string; author: { name: string; email: string }; branch: string },
): Promise<void> {
  const person = { ...input.author, timestamp: Math.floor(Date.now() / 1000), timezoneOffset: 0 };
  const commitOid = await git.writeCommit({
    fs,
    dir: ws.dir,
    commit: { message: input.message, tree: input.tree, parent: [ws.headOid], author: person, committer: person },
  });
  await git.writeRef({ fs, dir: ws.dir, ref: `refs/heads/${input.branch}`, value: commitOid });
  const result = await git.push({
    fs,
    http,
    dir: ws.dir,
    url: ws.url,
    ref: input.branch,
    remoteRef: `refs/heads/${input.branch}`,
    onAuth: ws.onAuth,
  });
  if (!result.ok) throw new Error(result.error ?? 'push отклонён');
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(label ?? `таймаут ${Math.round(ms / 1000)} с`)),
      ms,
    );
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
