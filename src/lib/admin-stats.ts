// Запросы к БД для панели администратора. Отдельный модуль, чтобы страницы
// оставались тонкими. Тяжёлые сводки заворачиваем в unstable_cache на 60 секунд.

import { unstable_cache } from 'next/cache';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { getSpendResetAt } from '@/lib/settings';
import { aiCalls, analyses, analysisJobs, events, repositories, users } from '@/db/schema';

// ---------- Общая сводка ----------

export type OverviewStats = {
  analyses: { day: number; week: number; month: number; done: number; failed: number };
  users: { total: number; activeWeek: number };
  ranking: { published: number };
  medianRuntimeMs: number | null;
};

export const getOverviewStats = unstable_cache(
  async (): Promise<OverviewStats> => {
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 3600 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 3600 * 1000);

    const [analysesRows, doneRow, failedRow, usersRow, activeUsersRow, publishedRow, runtimeRows] =
      await Promise.all([
        db
          .select({
            day: sql<number>`sum(case when ${analyses.createdAt} >= ${dayAgo} then 1 else 0 end)::int`,
            week: sql<number>`sum(case when ${analyses.createdAt} >= ${weekAgo} then 1 else 0 end)::int`,
            month: sql<number>`sum(case when ${analyses.createdAt} >= ${monthAgo} then 1 else 0 end)::int`,
          })
          .from(analyses),
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(analyses)
          .where(eq(analyses.status, 'done')),
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(analyses)
          .where(eq(analyses.status, 'failed')),
        db.select({ n: sql<number>`count(*)::int` }).from(users),
        db
          .select({ n: sql<number>`count(distinct ${analyses.requestedBy})::int` })
          .from(analyses)
          .where(gte(analyses.createdAt, weekAgo)),
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(analyses)
          .where(and(eq(analyses.isPublic, true), eq(analyses.status, 'done'))),
        db
          .select({
            runtime: sql<number>`extract(epoch from (${analyses.finishedAt} - ${analyses.createdAt})) * 1000`,
          })
          .from(analyses)
          .where(and(eq(analyses.status, 'done'), sql`${analyses.finishedAt} is not null`))
          .orderBy(desc(analyses.finishedAt))
          .limit(200),
      ]);

    const medianRuntimeMs = median(runtimeRows.map((r) => Number(r.runtime)).filter(Number.isFinite));

    return {
      analyses: {
        day: analysesRows[0]?.day ?? 0,
        week: analysesRows[0]?.week ?? 0,
        month: analysesRows[0]?.month ?? 0,
        done: doneRow[0]?.n ?? 0,
        failed: failedRow[0]?.n ?? 0,
      },
      users: {
        total: usersRow[0]?.n ?? 0,
        activeWeek: activeUsersRow[0]?.n ?? 0,
      },
      ranking: { published: publishedRow[0]?.n ?? 0 },
      medianRuntimeMs,
    };
  },
  ['admin-overview'],
  { revalidate: 60 },
);

// ---------- Расходы на ИИ ----------

export type AiSpendStats = {
  todayRub: number;
  monthRub: number;
  allTimeRub: number;
  byProviderModel: Array<{ provider: string; model: string; callsN: number; costRub: number }>;
  cachedRatio: number;
  savedRub: number;
  /** С какого момента считаются расходы, если счётчик обнуляли. */
  resetAt: string | null;
};

export const getAiSpend = unstable_cache(
  async (): Promise<AiSpendStats> => {
    const now = Date.now();
    // Обнуление счётчика в админке не стирает журнал вызовов: просто сдвигает
    // точку, с которой считаются суммы.
    const resetAt = await getSpendResetAt();
    const since = (from: Date): Date => (resetAt && resetAt > from ? resetAt : from);
    const dayAgo = since(new Date(now - 24 * 3600 * 1000));
    const monthAgo = since(new Date(now - 30 * 24 * 3600 * 1000));

    const [today, month, allTime, groups, cache] = await Promise.all([
      db
        .select({ s: sql<string>`coalesce(sum(${aiCalls.costRub}),0)::text` })
        .from(aiCalls)
        .where(gte(aiCalls.createdAt, dayAgo)),
      db
        .select({ s: sql<string>`coalesce(sum(${aiCalls.costRub}),0)::text` })
        .from(aiCalls)
        .where(gte(aiCalls.createdAt, monthAgo)),
      resetAt
        ? db
            .select({ s: sql<string>`coalesce(sum(${aiCalls.costRub}),0)::text` })
            .from(aiCalls)
            .where(gte(aiCalls.createdAt, resetAt))
        : db.select({ s: sql<string>`coalesce(sum(${aiCalls.costRub}),0)::text` }).from(aiCalls),
      db
        .select({
          provider: aiCalls.provider,
          model: aiCalls.model,
          callsN: sql<number>`count(*)::int`,
          costRub: sql<string>`coalesce(sum(${aiCalls.costRub}),0)::text`,
        })
        .from(aiCalls)
        .groupBy(aiCalls.provider, aiCalls.model),
      db
        .select({
          totalCalls: sql<number>`count(*)::int`,
          cachedCalls: sql<number>`sum(case when ${aiCalls.status} = 'cached' then 1 else 0 end)::int`,
          avgTokensSaved: sql<number>`coalesce(avg(${aiCalls.promptTokens} + ${aiCalls.completionTokens}),0)`,
        })
        .from(aiCalls),
    ]);

    const totalCalls = cache[0]?.totalCalls ?? 0;
    const cachedCalls = cache[0]?.cachedCalls ?? 0;
    const cachedRatio = totalCalls > 0 ? cachedCalls / totalCalls : 0;

    // Экономия: считаем как среднюю стоимость успешного вызова × число cached.
    const successRows = await db
      .select({ avgCost: sql<string>`coalesce(avg(${aiCalls.costRub}),0)::text` })
      .from(aiCalls)
      .where(eq(aiCalls.status, 'ok'));
    const avgSuccessRub = Number.parseFloat(successRows[0]?.avgCost ?? '0');
    const savedRub = Number.isFinite(avgSuccessRub) ? avgSuccessRub * cachedCalls : 0;

    return {
      todayRub: Number.parseFloat(today[0]?.s ?? '0'),
      monthRub: Number.parseFloat(month[0]?.s ?? '0'),
      allTimeRub: Number.parseFloat(allTime[0]?.s ?? '0'),
      byProviderModel: groups.map((g) => ({
        provider: g.provider,
        model: g.model,
        callsN: g.callsN,
        costRub: Number.parseFloat(g.costRub),
      })),
      cachedRatio,
      savedRub,
      resetAt: resetAt ? resetAt.toISOString() : null,
    };
  },
  ['admin-ai-spend'],
  { revalidate: 60, tags: ['ai-spend'] },
);

// ---------- Очередь ----------

export type QueueRow = {
  jobId: string;
  analysisId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  attempts: number;
  lockedBy: string | null;
  lastError: string | null;
  createdAt: string;
  orgRepo: string | null;
};

export async function getQueueRows(limit = 100): Promise<QueueRow[]> {
  const rows = await db
    .select({
      jobId: analysisJobs.id,
      analysisId: analysisJobs.analysisId,
      attempts: analysisJobs.attempts,
      lockedBy: analysisJobs.lockedBy,
      lastError: analysisJobs.lastError,
      createdAt: analysisJobs.createdAt,
      status: analyses.status,
      org: repositories.orgSlug,
      repo: repositories.repoSlug,
    })
    .from(analysisJobs)
    .innerJoin(analyses, eq(analysisJobs.analysisId, analyses.id))
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .orderBy(desc(analysisJobs.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    jobId: r.jobId,
    analysisId: r.analysisId,
    status: r.status,
    attempts: r.attempts,
    lockedBy: r.lockedBy,
    lastError: r.lastError,
    createdAt: r.createdAt.toISOString(),
    orgRepo: r.org && r.repo ? `${r.org}/${r.repo}` : null,
  }));
}

// ---------- Пользователи ----------

export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  blockedAt: string | null;
  analysesN: number;
};

export async function getUsersList(limit = 100): Promise<AdminUserRow[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      blockedAt: users.blockedAt,
      analysesN: sql<number>`(select count(*)::int from ${analyses} where ${analyses.requestedBy} = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    createdAt: r.createdAt.toISOString(),
    blockedAt: r.blockedAt ? r.blockedAt.toISOString() : null,
    analysesN: r.analysesN,
  }));
}

// ---------- Репозитории / анализы ----------

export type AdminAnalysisRow = {
  id: string;
  /** Нужен, чтобы удалить репозиторий целиком со всеми его прогонами. */
  repositoryId: string;
  orgRepo: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  score: number | null;
  isPublic: boolean;
  createdAt: string;
};

export async function getAllAnalyses(
  status?: 'queued' | 'running' | 'done' | 'failed',
  limit = 200,
): Promise<AdminAnalysisRow[]> {
  const rows = await db
    .select({
      id: analyses.id,
      repositoryId: analyses.repositoryId,
      status: analyses.status,
      score: analyses.score,
      isPublic: analyses.isPublic,
      createdAt: analyses.createdAt,
      org: repositories.orgSlug,
      repo: repositories.repoSlug,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(status ? eq(analyses.status, status) : undefined)
    .orderBy(desc(analyses.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    repositoryId: r.repositoryId,
    orgRepo: `${r.org}/${r.repo}`,
    status: r.status,
    score: r.score ?? null,
    isPublic: r.isPublic,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ---------- Последние события ----------

export async function getRecentEvents(limit = 50) {
  return db.select().from(events).orderBy(desc(events.createdAt)).limit(limit);
}

// ---------- utils ----------

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}
