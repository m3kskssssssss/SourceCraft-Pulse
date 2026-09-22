// История оценок: личная (все прогоны пользователя) и по репозиторию.
//
// Отличие от ranking.ts: там только опубликованное для всех, здесь — то, что
// вправе видеть конкретный смотрящий. Свои анализы видны независимо от
// публикации, чужие — только публичные.

import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, repositories } from '@/db/schema';
import { pickCategoryValues, type CategoryValues } from '@/lib/category-meta';

export type AnalysisStatus = 'queued' | 'running' | 'done' | 'failed';

export type HistoryItem = {
  id: string;
  org: string;
  repo: string;
  language: string | null;
  status: AnalysisStatus;
  /** 'project' | 'material' | 'unclear'. */
  kind: string | null;
  score: number | null;
  categories: CategoryValues;
  isPublic: boolean;
  createdAt: string;
  finishedAt: string | null;
  /** На сколько балл отличается от предыдущего прогона этого же репозитория. */
  delta: number | null;
};

/** Все анализы пользователя, независимо от публикации. */
export async function getUserAnalyses(userId: string, limit = 60): Promise<HistoryItem[]> {
  const rows = await db
    .select(historySelection())
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(eq(analyses.requestedBy, userId))
    .orderBy(desc(analyses.createdAt))
    .limit(limit);

  return withDeltasPerRepo(rows.map(toHistoryItem));
}

/**
 * Прогоны одного репозитория, которые вправе видеть смотрящий:
 * свои — любые, чужие — только опубликованные.
 */
export async function getRepoHistory(params: {
  org: string;
  repo: string;
  viewerId?: string | null;
  limit?: number;
}): Promise<HistoryItem[]> {
  const visible = params.viewerId
    ? or(eq(analyses.isPublic, true), eq(analyses.requestedBy, params.viewerId))
    : eq(analyses.isPublic, true);

  const rows = await db
    .select(historySelection())
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(
      and(
        eq(repositories.orgSlug, params.org),
        eq(repositories.repoSlug, params.repo),
        eq(analyses.status, 'done'),
        visible,
      ),
    )
    .orderBy(desc(analyses.finishedAt))
    .limit(params.limit ?? 20);

  return withDeltasPerRepo(rows.map(toHistoryItem));
}

/** Сколько раз этот репозиторий вообще оценивали (видимые смотрящему прогоны). */
export async function countRepoHistory(params: {
  org: string;
  repo: string;
  viewerId?: string | null;
}): Promise<number> {
  const visible = params.viewerId
    ? or(eq(analyses.isPublic, true), eq(analyses.requestedBy, params.viewerId))
    : eq(analyses.isPublic, true);

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(
      and(
        eq(repositories.orgSlug, params.org),
        eq(repositories.repoSlug, params.repo),
        eq(analyses.status, 'done'),
        visible,
      ),
    );
  return rows[0]?.count ?? 0;
}

// ---------- внутреннее ----------

function historySelection() {
  return {
    id: analyses.id,
    org: repositories.orgSlug,
    repo: repositories.repoSlug,
    language: repositories.language,
    status: analyses.status,
    kind: analyses.kind,
    score: analyses.score,
    categoryScores: analyses.categoryScores,
    isPublic: analyses.isPublic,
    createdAt: analyses.createdAt,
    finishedAt: analyses.finishedAt,
  };
}

type HistoryRow = {
  id: string;
  org: string;
  repo: string;
  language: string | null;
  status: AnalysisStatus;
  kind: string | null;
  score: number | null;
  /** jsonb из базы: разбирается pickCategoryValues. */
  categoryScores: unknown;
  isPublic: boolean;
  createdAt: Date;
  finishedAt: Date | null;
};

function toHistoryItem(row: HistoryRow): HistoryItem {
  return {
    id: row.id,
    org: row.org,
    repo: row.repo,
    language: row.language ?? null,
    status: row.status,
    kind: row.kind ?? null,
    score: row.score ?? null,
    categories: pickCategoryValues(row.categoryScores),
    isPublic: row.isPublic,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    delta: null,
  };
}

/**
 * Считает дельту балла к предыдущему по времени прогону того же репозитория.
 * Список приходит от нового к старому, поэтому идём с конца.
 */
function withDeltasPerRepo(items: HistoryItem[]): HistoryItem[] {
  const previousScore = new Map<string, number>();
  const result = [...items];

  for (let i = result.length - 1; i >= 0; i -= 1) {
    const item = result[i]!;
    if (item.score === null) continue;
    const key = `${item.org}/${item.repo}`;
    const before = previousScore.get(key);
    if (before !== undefined) {
      result[i] = { ...item, delta: item.score - before };
    }
    previousScore.set(key, item.score);
  }

  return result;
}
