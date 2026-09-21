// Граф коммитов: путь, которым репозиторий пришёл к нынешнему состоянию.
//
// История у нас уже прочитана для метрик активности, но там от неё остаются
// только агрегаты — число коммитов, авторы, bus factor. Для дерева нужен сам
// путь: кто за кем, где ветка отошла и где влилась обратно.
//
// Клон берём одной веткой, поэтому в графе — история ветки по умолчанию.
// Коммиты слитых веток в ней есть (у merge-коммита два родителя), а вот
// ветки, которые никогда не сливались, в клон не попадают: рисовать то, чего
// не скачивали, мы не будем.
//
// В факты кладём не всё: у старого репозитория тысячи коммитов, а строка
// анализа в БД не резиновая. Оставляем свежую часть и корень — то есть оба
// конца пути, — а середину честно помечаем разрывом.

import fs from 'node:fs';
import git from 'isomorphic-git';
import type { RepoClone } from './clone';
import { readCloneCommits, type RawCommit } from './commits';

export type GraphCommit = {
  /** Короткий sha — длинный в интерфейсе не нужен. */
  oid: string;
  /** Короткие sha родителей. Два и больше — merge. */
  parents: string[];
  author: string;
  /** ISO-дата коммита автора. */
  date: string;
  subject: string;
  /** Дорожка для отрисовки: 0 — основная линия. */
  lane: number;
  /** Ветки и теги, указывающие на этот коммит. */
  refs: string[];
};

export type GitGraph = {
  available: boolean;
  /** От новых к старым. Между свежей частью и корнем возможен разрыв. */
  commits: GraphCommit[];
  /** Сколько дорожек занял граф — ширина картинки. */
  laneCount: number;
  /** Сколько коммитов прочитали из клона до обрезки. */
  totalRead: number;
  /** Сколько коммитов выброшено в середине пути. */
  skipped: number;
  /** После какого индекса в commits идёт разрыв. null — путь сплошной. */
  gapAfterIndex: number | null;
  /** Клон упёрся в предел глубины: самый старый коммит — не корень репозитория. */
  truncated: boolean;
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  errors: string[];
};

export type CollectGitGraphOptions = {
  /** Готовый лог: тот же, что считают метрики активности. */
  commits?: RawCommit[];
  /** Сколько коммитов читать из клона, если лог не передали. */
  readLimit?: number;
  /** Сколько свежих коммитов оставить в фактах. */
  keepRecent?: number;
  /** Сколько самых старых коммитов оставить — начало пути. */
  keepRoot?: number;
};

const DEFAULT_READ_LIMIT = 2_000;
const DEFAULT_KEEP_RECENT = 220;
const DEFAULT_KEEP_ROOT = 30;
/** Длина короткого sha. */
const SHORT = 7;

export function emptyGitGraph(errors: string[] = []): GitGraph {
  return {
    available: false,
    commits: [],
    laneCount: 0,
    totalRead: 0,
    skipped: 0,
    gapAfterIndex: null,
    truncated: false,
    firstCommitDate: null,
    lastCommitDate: null,
    errors,
  };
}

export async function collectGitGraph(
  repo: RepoClone,
  options: CollectGitGraphOptions = {},
): Promise<GitGraph> {
  const readLimit = options.readLimit ?? DEFAULT_READ_LIMIT;
  const keepRecent = options.keepRecent ?? DEFAULT_KEEP_RECENT;
  const keepRoot = options.keepRoot ?? DEFAULT_KEEP_ROOT;

  let log: RawCommit[];
  try {
    log = options.commits ?? (await readCloneCommits(repo, readLimit));
  } catch (err) {
    return emptyGitGraph([`git_graph_failed:${describe(err)}`]);
  }
  if (log.length === 0) return emptyGitGraph(['git_graph_empty']);

  const refs = await readRefs(repo);

  const all = log.map((entry) => ({
    oid: short(entry.oid),
    parents: entry.parents.map(short),
    author: entry.authorName,
    date: entry.authorDate,
    subject: entry.subject.slice(0, 120),
    refs: refs.get(entry.oid) ?? [],
  }));

  // Дорожки считаем по всей прочитанной истории, и только потом выбрасываем
  // середину: иначе начало пути, потеряв родителя, уехало бы на свою дорожку
  // и выглядело бы отдельной веткой.
  const lanes = assignLanes(all);
  const withLanes: GraphCommit[] = all.map((commit, idx) => ({
    ...commit,
    lane: lanes.lanes[idx] ?? 0,
  }));

  const { kept, skipped, gapAfterIndex } = trimMiddle(withLanes, keepRecent, keepRoot);
  const laneCount = kept.reduce((max, commit) => Math.max(max, commit.lane + 1), 1);

  return {
    available: true,
    commits: kept,
    laneCount,
    totalRead: all.length,
    skipped,
    gapAfterIndex,
    // Ровно на пределе считаем, что дальше история есть, просто мы её не брали.
    truncated: all.length >= readLimit || repo.shallow,
    firstCommitDate: all[all.length - 1]?.date ?? null,
    lastCommitDate: all[0]?.date ?? null,
    errors: [],
  };
}

/**
 * Раскладывает коммиты по дорожкам. Чистая функция: на вход список от новых
 * к старым, на выход — номер дорожки для каждого.
 *
 * Правило простое: коммит занимает дорожку, которая его ждала, первый родитель
 * продолжает ту же дорожку (основная линия не виляет), остальные родители
 * уходят в свободные. Там, где ветка влилась обратно, дорожки сходятся в одну
 * и лишняя освобождается под следующую.
 */
export function assignLanes(commits: Array<{ oid: string; parents: string[] }>): {
  lanes: number[];
  laneCount: number;
} {
  /** Какой коммит ожидается в каждой дорожке. null — дорожка свободна. */
  const pending: Array<string | null> = [];
  const lanes: number[] = [];
  let laneCount = 0;

  for (const commit of commits) {
    // Коммита может ждать сразу несколько дорожек — значит, в нём они сходятся.
    // Он встаёт на самую левую, остальные освобождаются.
    let lane = -1;
    for (let i = 0; i < pending.length; i += 1) {
      if (pending[i] !== commit.oid) continue;
      if (lane === -1) lane = i;
      else pending[i] = null;
    }
    if (lane === -1) lane = takeFreeLane(pending);

    lanes.push(lane);
    laneCount = Math.max(laneCount, lane + 1);

    // Первый родитель наследует дорожку коммита, остальные разбегаются.
    pending[lane] = commit.parents[0] ?? null;
    for (const parent of commit.parents.slice(1)) {
      if (pending.includes(parent)) continue;
      pending[takeFreeLane(pending)] = parent;
    }
  }

  return { lanes, laneCount: Math.max(laneCount, 1) };
}

// ---------- helpers ----------

function takeFreeLane(pending: Array<string | null>): number {
  const free = pending.indexOf(null);
  if (free !== -1) return free;
  pending.push(null);
  return pending.length - 1;
}

/** Оставляет оба конца пути, выбрасывая середину. */
function trimMiddle<T>(
  items: T[],
  keepRecent: number,
  keepRoot: number,
): { kept: T[]; skipped: number; gapAfterIndex: number | null } {
  if (items.length <= keepRecent + keepRoot) {
    return { kept: items, skipped: 0, gapAfterIndex: null };
  }
  return {
    kept: [...items.slice(0, keepRecent), ...items.slice(items.length - keepRoot)],
    skipped: items.length - keepRecent - keepRoot,
    gapAfterIndex: keepRecent - 1,
  };
}

/** Ветки и теги по коммитам. Украшение: ошибки здесь молча игнорируем. */
async function readRefs(repo: RepoClone): Promise<Map<string, string[]>> {
  const byOid = new Map<string, string[]>();

  const add = (oid: string, label: string): void => {
    const list = byOid.get(oid);
    if (list) list.push(label);
    else byOid.set(oid, [label]);
  };

  try {
    for (const tag of await git.listTags({ fs, dir: repo.dir })) {
      const oid = await peel(repo, `refs/tags/${tag}`);
      if (oid) add(oid, tag);
    }
  } catch {
    // теги не пришли — не беда
  }

  try {
    for (const branch of await git.listBranches({ fs, dir: repo.dir, remote: 'origin' })) {
      if (branch === 'HEAD') continue;
      const oid = await peel(repo, `refs/remotes/origin/${branch}`);
      if (oid) add(oid, branch);
    }
  } catch {
    // веток нет — тоже не беда
  }

  return byOid;
}

/** Разыменовывает ссылку до коммита: аннотированный тег указывает на объект тега. */
async function peel(repo: RepoClone, ref: string): Promise<string | null> {
  try {
    const oid = await git.resolveRef({ fs, dir: repo.dir, ref });
    try {
      await git.readCommit({ fs, dir: repo.dir, oid, cache: repo.cache });
      return oid;
    } catch {
      const tag = await git.readTag({ fs, dir: repo.dir, oid, cache: repo.cache });
      return tag.tag.object;
    }
  } catch {
    return null;
  }
}

function short(oid: string): string {
  return oid.slice(0, SHORT);
}


function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
