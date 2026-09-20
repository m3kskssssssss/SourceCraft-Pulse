// Общий query-модуль для публичного рейтинга. Используется и на / (главная),
// и в /api/public/leaderboard. Возвращает уже подготовленные для UI/JSON
// сущности без внутренних полей вроде requestedBy.

import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, repositories } from '@/db/schema';

export type LeaderboardSort = 'score' | 'forks';

export type LeaderboardItem = {
  id: string;
  org: string;
  repo: string;
  language: string | null;
  score: number | null;
  forks: number | null;
  lastSyncedAt: string | null;
  publishedAt: string | null;
};

export type LeaderboardParams = {
  sort?: LeaderboardSort;
  query?: string;
  language?: string;
  limit?: number;
  offset?: number;
};

export async function getLeaderboard(params: LeaderboardParams = {}): Promise<{
  items: LeaderboardItem[];
  total: number;
}> {
  const limit = clampInt(params.limit ?? 20, 1, 100);
  const offset = clampInt(params.offset ?? 0, 0, 10_000);
  const sort: LeaderboardSort = params.sort === 'forks' ? 'forks' : 'score';

  const where = and(
    eq(analyses.isPublic, true),
    eq(analyses.status, 'done'),
    params.query
      ? sql`(${ilike(repositories.orgSlug, `%${params.query}%`)} OR ${ilike(
          repositories.repoSlug,
          `%${params.query}%`,
        )})`
      : undefined,
    params.language ? eq(repositories.language, params.language) : undefined,
  );

  // Строки и счётчик — независимые запросы, отправляем их одновременно:
  // последовательно они складывались в двойной round-trip на каждый рендер.
  const rowsPromise = db
    .select({
      id: analyses.id,
      org: repositories.orgSlug,
      repo: repositories.repoSlug,
      language: repositories.language,
      score: analyses.score,
      forks: repositories.forksCount,
      lastSyncedAt: repositories.lastSyncedAt,
      publishedAt: analyses.finishedAt,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(where)
    .orderBy(
      sort === 'forks' ? desc(repositories.forksCount) : desc(analyses.score),
      desc(analyses.finishedAt),
    )
    .limit(limit)
    .offset(offset);

  const totalPromise = db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(where);

  const [rows, totalRows] = await Promise.all([rowsPromise, totalPromise]);
  const total = totalRows[0]?.count ?? 0;

  const items: LeaderboardItem[] = rows.map((r) => ({
    id: r.id,
    org: r.org,
    repo: r.repo,
    language: r.language ?? null,
    score: r.score ?? null,
    forks: r.forks ?? null,
    lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  }));

  return { items, total };
}

/** Последний опубликованный анализ для конкретной пары org/repo. */
export async function getLatestPublicAnalysis(
  org: string,
  repo: string,
): Promise<LeaderboardItem | null> {
  const rows = await db
    .select({
      id: analyses.id,
      org: repositories.orgSlug,
      repo: repositories.repoSlug,
      language: repositories.language,
      score: analyses.score,
      forks: repositories.forksCount,
      lastSyncedAt: repositories.lastSyncedAt,
      publishedAt: analyses.finishedAt,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(
      and(
        eq(repositories.orgSlug, org),
        eq(repositories.repoSlug, repo),
        eq(analyses.isPublic, true),
        eq(analyses.status, 'done'),
      ),
    )
    .orderBy(desc(analyses.finishedAt))
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    org: r.org,
    repo: r.repo,
    language: r.language ?? null,
    score: r.score ?? null,
    forks: r.forks ?? null,
    lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const n = Math.floor(value);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
