// Общий query-модуль для публичного рейтинга. Используется и на / (главная),
// и в /api/public/leaderboard. Возвращает уже подготовленные для UI/JSON
// сущности без внутренних полей вроде requestedBy.

import { and, desc, eq, ilike, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, analysisComments, analysisRatings, repositories } from '@/db/schema';
import {
  CATEGORY_ORDER,
  EMPTY_CATEGORY_VALUES,
  pickCategoryValues,
  type CategoryValues,
} from '@/lib/category-meta';

/**
 * 'score' — балл здоровья, 'forks' — «по популярности».
 *
 * Популярность теперь значит оценку людей, а не число форков: звёзды
 * пользователей — про то, насколько разбор полезен, и именно их просили
 * поднимать наверх. Форки остались тай-брейком между равными средними, и имя
 * ключа не меняем, чтобы старые ссылки и бейджи не отвалились.
 */
export type LeaderboardSort = 'score' | 'forks';

export type LeaderboardItem = {
  id: string;
  org: string;
  repo: string;
  language: string | null;
  /** 'project' | 'material' | 'unclear'. Материал оценкой не меряем. */
  kind: string | null;
  score: number | null;
  /** Баллы категорий: в строке рейтинга они объясняют оценку. */
  categories: CategoryValues;
  forks: number | null;
  /** Средняя оценка пользователей, 1..5. null — никто не оценивал. */
  ratingAverage: number | null;
  ratingCount: number;
  commentCount: number;
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
  // Оценки и комментарии считаем коррелированными подзапросами: join с
  // group by пришлось бы тащить через всю сортировку и пагинацию.
  const ratingAvg = sql<string | null>`(
    select avg(${analysisRatings.value})::text
    from ${analysisRatings}
    where ${analysisRatings.analysisId} = ${analyses.id}
  )`;
  const ratingCount = sql<number>`(
    select count(*)::int
    from ${analysisRatings}
    where ${analysisRatings.analysisId} = ${analyses.id}
  )`;
  const commentCount = sql<number>`(
    select count(*)::int
    from ${analysisComments}
    where ${analysisComments.analysisId} = ${analyses.id}
      and ${analysisComments.deletedAt} is null
  )`;

  const rowsPromise = db
    .select({
      id: analyses.id,
      org: repositories.orgSlug,
      repo: repositories.repoSlug,
      language: repositories.language,
      kind: analyses.kind,
      score: analyses.score,
      categoryScores: analyses.categoryScores,
      forks: repositories.forksCount,
      ratingAvg,
      ratingCount,
      commentCount,
      lastSyncedAt: repositories.lastSyncedAt,
      publishedAt: analyses.finishedAt,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(where)
    // Материалы не конкурируют с проектами за место в рейтинге: у них нет
    // оценки, поэтому они идут следом, своим списком.
    .orderBy(
      sql`case when ${analyses.kind} = 'material' then 1 else 0 end`,
      ...(sort === 'forks'
        ? [
            // Неоценённое вниз: пустая средняя не должна выигрывать у
            // честной четвёрки. Форки решают спор равных.
            sql`${ratingAvg} is null`,
            sql`${ratingAvg} desc`,
            desc(repositories.forksCount),
          ]
        : [desc(analyses.score)]),
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
    kind: r.kind ?? null,
    score: r.score ?? null,
    categories: pickCategoryValues(r.categoryScores),
    forks: r.forks ?? null,
    ratingAverage: parseAverage(r.ratingAvg),
    ratingCount: r.ratingCount ?? 0,
    commentCount: r.commentCount ?? 0,
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

/** Диапазоны баллов для распределения на странице рейтинга. */
export const SCORE_BUCKETS = [
  { from: 0, to: 29, label: '0–29' },
  { from: 30, to: 49, label: '30–49' },
  { from: 50, to: 69, label: '50–69' },
  { from: 70, to: 84, label: '70–84' },
  { from: 85, to: 100, label: '85–100' },
] as const;

export type LeaderboardOverview = {
  /** Репозиториев в рейтинге: проекты и материалы вместе. */
  total: number;
  projects: number;
  materials: number;
  averageScore: number | null;
  medianScore: number | null;
  /** Сколько проектов в каждом диапазоне SCORE_BUCKETS. */
  buckets: number[];
  /** Средний балл каждой категории по проектам, где он посчитан. */
  categoryAverages: CategoryValues;
  ratings: number;
  comments: number;
  lastPublishedAt: string | null;
};

/**
 * Сводка по всему рейтингу. Строк в рейтинге немного (по одной публичной на
 * репозиторий), поэтому считаем в коде по одной выборке, а не пятью
 * агрегатами по jsonb с баллами категорий.
 */
export async function getLeaderboardOverview(): Promise<LeaderboardOverview> {
  const publicDone = and(eq(analyses.isPublic, true), eq(analyses.status, 'done'));
  const [rows, ratings, comments] = await Promise.all([
    db
      .select({
        kind: analyses.kind,
        score: analyses.score,
        categoryScores: analyses.categoryScores,
        finishedAt: analyses.finishedAt,
      })
      .from(analyses)
      .where(publicDone)
      .limit(5000),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(analysisRatings)
      .innerJoin(analyses, eq(analyses.id, analysisRatings.analysisId))
      .where(publicDone),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(analysisComments)
      .innerJoin(analyses, eq(analyses.id, analysisComments.analysisId))
      .where(and(publicDone, isNull(analysisComments.deletedAt))),
  ]);

  const projects = rows.filter((r) => r.kind !== 'material');
  const scores = projects
    .map((r) => r.score)
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b);
  const buckets = SCORE_BUCKETS.map((b) => scores.filter((v) => v >= b.from && v <= b.to).length);

  const categoryAverages: CategoryValues = { ...EMPTY_CATEGORY_VALUES };
  for (const key of CATEGORY_ORDER) {
    const values = projects
      .map((r) => pickCategoryValues(r.categoryScores)[key])
      .filter((v): v is number => typeof v === 'number');
    categoryAverages[key] = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  }

  const last = rows.reduce<Date | null>(
    (acc, r) => (r.finishedAt && (!acc || r.finishedAt > acc) ? r.finishedAt : acc),
    null,
  );

  return {
    total: rows.length,
    projects: projects.length,
    materials: rows.length - projects.length,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    medianScore: scores.length ? median(scores) : null,
    buckets,
    categoryAverages,
    ratings: ratings[0]?.count ?? 0,
    comments: comments[0]?.count ?? 0,
    lastPublishedAt: last ? last.toISOString() : null,
  };
}

/** Медиана уже отсортированного списка. */
function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  return Math.round(value ?? 0);
}

/** Последний опубликованный анализ для конкретной пары org/repo. */
export async function getLatestPublicAnalysis(
  org: string,
  repo: string,
): Promise<LeaderboardItem | null> {
  // Слаг ищем без учёта регистра: в README адрес бейджа часто перепечатывают
  // руками, а «Org/Repo» и «org/repo» на SourceCraft — один репозиторий.
  const rows = await db
    .select({
      id: analyses.id,
      org: repositories.orgSlug,
      repo: repositories.repoSlug,
      language: repositories.language,
      kind: analyses.kind,
      score: analyses.score,
      categoryScores: analyses.categoryScores,
      forks: repositories.forksCount,
      lastSyncedAt: repositories.lastSyncedAt,
      publishedAt: analyses.finishedAt,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(
      and(
        ilike(repositories.orgSlug, org),
        ilike(repositories.repoSlug, repo),
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
    kind: r.kind ?? null,
    score: r.score ?? null,
    categories: pickCategoryValues(r.categoryScores),
    forks: r.forks ?? null,
    // Бейджу и публичному API оценки людей не нужны — считать их ради одной
    // строки незачем.
    ratingAverage: null,
    ratingCount: 0,
    commentCount: 0,
    lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  };
}

/** avg() из Postgres приходит строкой; пусто — никто не оценивал. */
function parseAverage(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const n = Math.floor(value);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/**
 * Есть ли у репозитория посчитанный, но не опубликованный прогон.
 * Нужно бейджу: прочерк без объяснения выглядит как поломка, хотя на деле
 * владелец просто не нажал «Показать в рейтинге».
 */
export async function hasUnpublishedAnalysis(org: string, repo: string): Promise<boolean> {
  const rows = await db
    .select({ id: analyses.id })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(
      and(
        ilike(repositories.orgSlug, org),
        ilike(repositories.repoSlug, repo),
        eq(analyses.status, 'done'),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Что видит бейдж по этому слагу. Нужен для `?debug=1`: когда бейдж говорит
 * «нет оценки», а на странице анализ опубликован, вопрос ровно один — какие
 * строки в базе под этот адрес вообще попадают.
 */
export async function describeBadgeLookup(
  org: string,
  repo: string,
): Promise<{
  slug: string;
  repositories: Array<{ org: string; repo: string; analyses: number }>;
  done: number;
  published: number;
  latestPublicScore: number | null;
}> {
  const repos = await db
    .select({
      id: repositories.id,
      org: repositories.orgSlug,
      repo: repositories.repoSlug,
    })
    .from(repositories)
    .where(and(ilike(repositories.orgSlug, org), ilike(repositories.repoSlug, repo)));

  const ids = repos.map((r) => r.id);
  const counts = ids.length
    ? await db
        .select({
          repositoryId: analyses.repositoryId,
          total: sql<number>`count(*)::int`,
          done: sql<number>`sum(case when ${analyses.status} = 'done' then 1 else 0 end)::int`,
          published: sql<number>`sum(case when ${analyses.isPublic} then 1 else 0 end)::int`,
        })
        .from(analyses)
        .where(inArray(analyses.repositoryId, ids))
        .groupBy(analyses.repositoryId)
    : [];

  const latest = await getLatestPublicAnalysis(org, repo);

  return {
    slug: `${org}/${repo}`,
    repositories: repos.map((r) => ({
      org: r.org,
      repo: r.repo,
      analyses: counts.find((c) => c.repositoryId === r.id)?.total ?? 0,
    })),
    done: counts.reduce((sum, c) => sum + (c.done ?? 0), 0),
    published: counts.reduce((sum, c) => sum + (c.published ?? 0), 0),
    latestPublicScore: latest?.score ?? null,
  };
}
