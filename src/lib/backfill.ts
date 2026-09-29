// Догрузка дополнительной аналитики в уже посчитанные публичные анализы:
// сводка ревью PR и пустые коммиты. Без ИИ и без пересчёта балла.
//
// Работает порциями с дедлайном, поэтому одинаково годится для консоли
// (pnpm backfill:*), для /api/cron/backfill (функция до 300 с) и для
// кнопки в админке. Каждая попытка помечается в metrics.backfill: удачная
// снимает анализ из выборки по самим данным, неудачная — на сутки, чтобы
// репозиторий без PR или с недоступным клоном не крутился в каждом вызове.
//
//   - ревью — только API SourceCraft (lib/extra-analytics.ts, ensureReviewStats);
//   - пустые коммиты — клон истории за 90 дней и countEmptyCommits, как в анализе.

import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { analyses, repositories } from '../db/schema';
import { ensureReviewStats } from './extra-analytics';
import { withRepoClone } from './git/clone';
import { readCloneCommits } from './git/commits';
import { countEmptyCommits } from './git/stats';

type Db = NodePgDatabase<typeof schema>;

/** Столько же коммитов читает анализ (COMMIT_LIMIT в lib/collect.ts). */
const COMMIT_LIMIT = 2_000;
/** Порог большого репозитория (BIG_REPO_TREE_ENTRIES в lib/collect.ts). */
const BIG_REPO_TREE_ENTRIES = 5_000;
/** На один клон истории за 90 дней. */
const CLONE_TIMEOUT_MS = 60_000;
/** Худший случай одного репозитория: новый не берём, если до дедлайна меньше. */
const REVIEW_RESERVE_MS = 20_000;
const CLONE_RESERVE_MS = CLONE_TIMEOUT_MS + 10_000;

export type BackfillKind = 'reviews' | 'emptyCommits';
export type BackfillResult = { processed: number; filled: number; failed: number; remaining: number };

/** Анализ ещё не пробовали или неудачная попытка была больше суток назад. */
function notTriedRecently(kind: BackfillKind) {
  return sql`coalesce((${analyses.metrics} -> 'backfill' ->> ${kind})::timestamptz, 'epoch') < now() - interval '1 day'`;
}

const PUBLIC_DONE = and(eq(analyses.isPublic, true), eq(analyses.status, 'done'), eq(repositories.isPrivate, false));

const NEEDS_REVIEWS = and(
  PUBLIC_DONE,
  sql`coalesce((${analyses.metrics} -> 'facts' -> 'reviews' ->> 'available')::boolean, false) = false`,
  sql`coalesce((${analyses.metrics} -> 'reviews' ->> 'available')::boolean, false) = false`,
  sql`jsonb_typeof(${analyses.metrics} -> 'facts' -> 'pullRequests') = 'array'`,
  notTriedRecently('reviews'),
);

const NEEDS_EMPTY_COMMITS = and(
  PUBLIC_DONE,
  sql`(${analyses.metrics} -> 'facts' -> 'gitHistory' ->> 'available') = 'true'`,
  sql`(${analyses.metrics} -> 'facts' -> 'gitHistory' ->> 'commitsLast90Days') is not null`,
  sql`not ((${analyses.metrics} -> 'facts' -> 'gitHistory') ? 'emptyCommitsLast90Days')`,
  sql`coalesce((${analyses.metrics} -> 'facts' -> 'tree' ->> 'entriesCount')::int, 0) < ${BIG_REPO_TREE_ENTRIES}`,
  notTriedRecently('emptyCommits'),
);

async function countPending(db: Db, where: ReturnType<typeof and>): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(where);
  return row?.count ?? 0;
}

export async function pendingBackfill(db: Db): Promise<Record<BackfillKind, number>> {
  const [reviews, emptyCommits] = await Promise.all([
    countPending(db, NEEDS_REVIEWS),
    countPending(db, NEEDS_EMPTY_COMMITS),
  ]);
  return { reviews, emptyCommits };
}

async function markTried(db: Db, analysisId: string, kind: BackfillKind): Promise<void> {
  await db
    .update(analyses)
    .set({
      metrics: sql`jsonb_set(
        jsonb_set(coalesce(${analyses.metrics}, '{}'::jsonb), '{backfill}', coalesce(${analyses.metrics} -> 'backfill', '{}'::jsonb), true),
        ${`{backfill,${kind}}`}::text[], to_jsonb(now()::text), true)`,
    })
    .where(eq(analyses.id, analysisId));
}

/**
 * Прогоняет очередь `rows` в `concurrency` потоков, пока есть время. Новый
 * репозиторий не берётся, если до дедлайна меньше `reserveMs`.
 */
async function drain<T>(
  rows: T[],
  options: { deadline: number; concurrency: number; reserveMs: number },
  work: (row: T) => Promise<boolean>,
  onProgress?: (done: number, total: number) => void,
): Promise<{ processed: number; filled: number; failed: number }> {
  let next = 0;
  let processed = 0;
  let filled = 0;
  let failed = 0;
  await Promise.all(
    Array.from({ length: options.concurrency }, async () => {
      while (next < rows.length && Date.now() + options.reserveMs < options.deadline) {
        const row = rows[next++];
        if (row === undefined) break;
        const ok = await work(row).catch(() => false);
        processed += 1;
        if (ok) filled += 1;
        else failed += 1;
        onProgress?.(processed, rows.length);
      }
    }),
  );
  return { processed, filled, failed };
}

export async function backfillReviews(
  db: Db,
  options: { deadline: number; concurrency?: number; limit?: number; onProgress?: (done: number, total: number) => void },
): Promise<BackfillResult> {
  const rows = await db
    .select({ analysis: analyses, repository: repositories })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(NEEDS_REVIEWS)
    .limit(options.limit ?? 200);

  const result = await drain(
    rows,
    { deadline: options.deadline, concurrency: options.concurrency ?? 2, reserveMs: REVIEW_RESERVE_MS },
    async (row) => {
      const stats = await ensureReviewStats(db, row.analysis, row.repository).catch(() => null);
      if (stats?.available) return true;
      await markTried(db, row.analysis.id, 'reviews');
      return false;
    },
    options.onProgress,
  );
  return { ...result, remaining: await countPending(db, NEEDS_REVIEWS) };
}

export async function backfillEmptyCommits(
  db: Db,
  options: { deadline: number; concurrency?: number; limit?: number; onProgress?: (done: number, total: number) => void },
): Promise<BackfillResult> {
  const rows = await db
    .select({
      id: analyses.id,
      cloneUrl: repositories.cloneUrl,
      factsCloneUrl: sql<string | null>`${analyses.metrics} -> 'facts' -> 'cloneUrl' ->> 'https'`,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(NEEDS_EMPTY_COMMITS)
    .limit(options.limit ?? 100);

  const token = process.env.SOURCECRAFT_PAT || undefined;
  const result = await drain(
    rows,
    { deadline: options.deadline, concurrency: options.concurrency ?? 3, reserveMs: CLONE_RESERVE_MS },
    async (row) => {
      const cloneUrl = row.factsCloneUrl ?? row.cloneUrl;
      let empty: number | null = null;
      if (cloneUrl) {
        empty = await withRepoClone(
          { cloneUrlHttps: cloneUrl, token, strategy: 'window', totalTimeoutMs: CLONE_TIMEOUT_MS },
          async (clone) => (clone.tipOnly ? null : countEmptyCommits(await readCloneCommits(clone, COMMIT_LIMIT))),
        ).catch(() => null);
      }
      if (empty === null) {
        await markTried(db, row.id, 'emptyCommits');
        return false;
      }
      await db
        .update(analyses)
        .set({
          metrics: sql`jsonb_set(${analyses.metrics}, '{facts,gitHistory,emptyCommitsLast90Days}', ${String(empty)}::jsonb, true)`,
        })
        .where(eq(analyses.id, row.id));
      return true;
    },
    options.onProgress,
  );
  return { ...result, remaining: await countPending(db, NEEDS_EMPTY_COMMITS) };
}
