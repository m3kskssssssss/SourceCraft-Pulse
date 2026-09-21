// Общий query-модуль для публичного рейтинга. Используется и на / (главная),
// и в /api/public/leaderboard. Возвращает уже подготовленные для UI/JSON
// сущности без внутренних полей вроде requestedBy.

import { and, desc, eq, ilike, inArray, isNotNull, sql } from 'drizzle-orm';
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
  /** Фильтр по языкам: показываем строки с любым из них. */
  languages?: string[];
  limit?: number;
  offset?: number;
};

/** Язык и сколько за ним публичных анализов — для списка фильтра. */
export type LanguageFacet = { name: string; count: number };

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
    params.languages && params.languages.length > 0
      ? inArray(repositories.language, params.languages)
      : undefined,
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

/**
 * Языки, которые реально есть в рейтинге, от частого к редкому.
 * Нужны для выпадающего списка: предлагать язык, по которому ничего не найдётся, незачем.
 */
export async function getLanguageFacets(limit = 40): Promise<LanguageFacet[]> {
  const rows = await db
    .select({
      name: repositories.language,
      count: sql<number>`count(*)::int`,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(
      and(
        eq(analyses.isPublic, true),
        eq(analyses.status, 'done'),
        isNotNull(repositories.language),
      ),
    )
    .groupBy(repositories.language)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows
    .filter((r): r is { name: string; count: number } => Boolean(r.name))
    .map((r) => ({ name: r.name, count: r.count }));
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
