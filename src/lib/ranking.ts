// Общий query-модуль для публичного рейтинга. Используется и на / (главная),
// и в /api/public/leaderboard. Возвращает уже подготовленные для UI/JSON
// сущности без внутренних полей вроде requestedBy.

import { and, desc, eq, ilike, inArray, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, analysisComments, analysisRatings, catalogRepositories, repositories } from '@/db/schema';
import {
  CATEGORY_ORDER,
  EMPTY_CATEGORY_VALUES,
  pickCategoryValues,
  type CategoryValues,
} from '@/lib/category-meta';

/**
 * Сортировки рейтинга по ТЗ (раздел 4): по баллу, по лайкам SourceCraft и по
 * последней активности. 'forks' — средняя оценка людей в Pulse (форки решают
 * спор равных); имя ключа прежнее, чтобы старые ссылки не отвалились.
 */
export type LeaderboardSort = 'score' | 'likes' | 'activity' | 'forks';

export const LEADERBOARD_SORTS: readonly LeaderboardSort[] = ['score', 'likes', 'activity', 'forks'];

export function parseLeaderboardSort(value: string | null | undefined): LeaderboardSort {
  return LEADERBOARD_SORTS.includes(value as LeaderboardSort) ? (value as LeaderboardSort) : 'score';
}

/**
 * Место в рейтинге есть у всех, кроме помеченных при анализе копий. У прогонов
 * до появления пометки её нет — они участвуют, как раньше.
 */
const RANKED = sql`((${analyses.metrics} -> 'rating' ->> 'excluded') is null)`;

/**
 * Карточка каталога (суточный обход GET /repos) для той же пары org/repo:
 * оттуда свежие лайки и дата последнего обновления. Слаги сверяем без учёта
 * регистра — в repositories они такие, как их ввёл человек.
 */
const CATALOG_JOIN = sql`lower(${catalogRepositories.orgSlug}) = lower(${repositories.orgSlug})
  and lower(${catalogRepositories.repoSlug}) = lower(${repositories.repoSlug})`;

/** Факты анализа: карточка репозитория из API и история из клона. */
const FACT_LIKES = sql`(${analyses.metrics} -> 'facts' -> 'repository' -> 'rating' ->> 'value')`;
const FACT_REPO_UPDATED = sql`(${analyses.metrics} -> 'facts' -> 'repository' ->> 'last_updated')`;
const FACT_LAST_COMMIT = sql`(${analyses.metrics} -> 'facts' -> 'gitHistory' ->> 'lastCommitDate')`;

/** Строку из jsonb превращаем в дату, только если она на неё похожа. */
function asTimestamp(text: SQL) {
  return sql`case when ${text} ~ '^\\d{4}-\\d{2}-\\d{2}' then (${text})::timestamptz end`;
}

/**
 * Лайки SourceCraft (rating.value): свежие из каталога, иначе — на момент
 * анализа. null — неизвестно, а не ноль.
 */
const LIKES = sql<number | null>`coalesce(
  ${catalogRepositories.likes},
  case when ${FACT_LIKES} ~ '^-?\\d+(\\.\\d+)?$' then round((${FACT_LIKES})::numeric)::int end
)`;

/**
 * Последняя активность — самое позднее из: обновление по каталогу, обновление
 * по карточке на момент анализа, последний коммит в клоне. greatest()
 * пропускает null, поэтому хватает любого из трёх.
 */
const LAST_ACTIVITY = sql<Date | string | null>`greatest(
  ${catalogRepositories.lastUpdatedAt},
  ${asTimestamp(FACT_REPO_UPDATED)},
  ${asTimestamp(FACT_LAST_COMMIT)}
)`;

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

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
  /** Лайки SourceCraft. null — неизвестно. */
  likes: number | null;
  /** Последняя активность в репозитории (ISO). null — неизвестно. */
  lastActivityAt: string | null;
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
  const sort = parseLeaderboardSort(params.sort);

  const where = and(
    eq(analyses.isPublic, true),
    eq(analyses.status, 'done'),
    RANKED,
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
      likes: LIKES,
      lastActivityAt: LAST_ACTIVITY,
      ratingAvg,
      ratingCount,
      commentCount,
      lastSyncedAt: repositories.lastSyncedAt,
      publishedAt: analyses.finishedAt,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .leftJoin(catalogRepositories, CATALOG_JOIN)
    .where(where)
    // Материалы не конкурируют с проектами за место в рейтинге: у них нет
    // оценки, поэтому они идут следом, своим списком. Во всех сортировках
    // неизвестное — вниз, а спор равных решает балл здоровья: даже по лайкам
    // рейтинг не превращается в чистую популярность.
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
        : sort === 'likes'
          ? [sql`${LIKES} desc nulls last`, desc(analyses.score)]
          : sort === 'activity'
            ? [sql`${LAST_ACTIVITY} desc nulls last`, desc(analyses.score)]
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
    likes: r.likes === null || r.likes === undefined ? null : Number(r.likes),
    lastActivityAt: toIso(r.lastActivityAt),
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
        RANKED,
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
      .where(and(publicDone, RANKED))
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
      likes: LIKES,
      lastActivityAt: LAST_ACTIVITY,
      lastSyncedAt: repositories.lastSyncedAt,
      publishedAt: analyses.finishedAt,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .leftJoin(catalogRepositories, CATALOG_JOIN)
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
    likes: r.likes === null || r.likes === undefined ? null : Number(r.likes),
    lastActivityAt: toIso(r.lastActivityAt),
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
        // О приватном репозитории бейдж не говорит ничего, даже «не опубликован».
        eq(repositories.isPrivate, false),
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
