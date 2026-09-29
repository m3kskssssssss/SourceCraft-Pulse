// Каталог публичных репозиториев SourceCraft.
//
// GET /repos отдаёт весь публичный каталог (около 27 тысяч записей, ~275
// страниц по сотне). Обходим его только сортировкой по дате создания: при
// сортировке по рейтингу страницы пропускают и повторяют записи.
//
// Каталог — это карточки, а не оценки: клонов и ИИ здесь нет, обход стоит
// пару минут запросов к API. По нему рейтинг показывает «оценено N из M», а
// фоновая оценка (CATALOG_AUTO_ANALYZE) выбирает, кого считать дальше.

import { and, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { analyses, analysisJobs, catalogRepositories, repositories, settings } from '../db/schema';
import { getSourcecraftClient, type Repository, type SourcecraftClient } from './sourcecraft/client';

type Db = NodePgDatabase<typeof schema>;
type DbOrTx = Db | Parameters<Parameters<Db['transaction']>[0]>[0];

const PAGE_SIZE = 100;

export type CatalogSyncResult = {
  pages: number;
  seen: number;
  /** Обход дошёл до конца каталога — тогда исчезнувшие записи удалены. */
  complete: boolean;
  removed: number;
};

/**
 * Полный обход каталога. Пишет постранично, так что прерванный по дедлайну
 * обход не теряет уже прочитанного; удаляет исчезнувшие записи только после
 * полного прохода — иначе недочитанный хвост считался бы удалённым.
 */
export async function syncCatalog(
  db: Db,
  options: { deadline?: number; client?: SourcecraftClient; onPage?: (page: number, seen: number) => void } = {},
): Promise<CatalogSyncResult> {
  const client = options.client ?? getSourcecraftClient();
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY;
  const startedAt = new Date();
  let pageToken: string | undefined;
  let pages = 0;
  let seen = 0;

  for (;;) {
    if (Date.now() > deadline) return { pages, seen, complete: false, removed: 0 };
    const page = await client.discoverRepositories({ pageSize: PAGE_SIZE, pageToken, sortBy: 'created_at' });
    const rows = (page.repositories ?? [])
      .map(toCatalogRow)
      .filter((row): row is NonNullable<ReturnType<typeof toCatalogRow>> => row !== null);
    if (rows.length > 0) await upsertPage(db, rows);
    pages += 1;
    seen += rows.length;
    options.onPage?.(pages, seen);
    pageToken = page.next_page_token || undefined;
    if (!pageToken) break;
  }

  const removed = await db
    .delete(catalogRepositories)
    .where(lt(catalogRepositories.syncedAt, startedAt))
    .returning({ id: catalogRepositories.id });
  return { pages, seen, complete: true, removed: removed.length };
}

type CatalogRow = typeof catalogRepositories.$inferInsert;

/** Карточка из каталога → строка таблицы. Непубличные и безымянные — мимо. */
export function toCatalogRow(repo: Repository): CatalogRow | null {
  const org = repo.organization?.slug;
  const slug = repo.slug;
  if (!repo.id || !org || !slug) return null;
  if (repo.visibility && repo.visibility !== 'public') return null;
  const likes = repo.rating?.value;
  const updated = repo.last_updated ? new Date(repo.last_updated) : null;
  return {
    sourcecraftId: repo.id,
    orgSlug: org,
    repoSlug: slug,
    description: repo.description?.slice(0, 2000) || null,
    isEmpty: repo.is_empty === true,
    isFork: Boolean(repo.parent),
    isMirror: Boolean(repo.migration_source),
    isTemplate: Boolean(repo.template_type && repo.template_type !== 'not_a_template'),
    likes: typeof likes === 'number' && Number.isFinite(likes) ? Math.round(likes) : null,
    lastUpdatedAt: updated && !Number.isNaN(updated.getTime()) ? updated : null,
    syncedAt: new Date(),
  };
}

/**
 * Страница целиком: сначала убираем старые записи тех же репозиториев (по id —
 * переименованные, по слагу — пересозданные), потом вставляем свежие.
 */
async function upsertPage(db: Db, rows: CatalogRow[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(catalogRepositories)
      .where(
        or(
          inArray(
            catalogRepositories.sourcecraftId,
            rows.map((r) => r.sourcecraftId),
          ),
          ...rows.map((r) =>
            and(eq(catalogRepositories.orgSlug, r.orgSlug), eq(catalogRepositories.repoSlug, r.repoSlug)),
          ),
        ),
      );
    await tx.insert(catalogRepositories).values(rows);
  });
}

/** Пора ли обходить каталог: последняя синхронизация старше `hours` часов или её не было. */
export async function catalogSyncDue(db: Db, hours: number): Promise<boolean> {
  const result = await db.execute<{ last: string | Date | null }>(
    sql`select max(synced_at) as last from catalog_repositories`,
  );
  const raw = result.rows[0]?.last;
  if (!raw) return true;
  const last = new Date(raw).getTime();
  return !Number.isFinite(last) || Date.now() - last > hours * 3_600_000;
}

/** Сколько задач сейчас ждёт в очереди анализа — чтобы не заваливать её каталогом. */
export async function pendingJobs(db: Db): Promise<number> {
  const result = await db.execute<{ count: number }>(sql`select count(*)::int as count from analysis_jobs`);
  return result.rows[0]?.count ?? 0;
}

// ---------- Сводка для рейтинга ----------

export type CatalogStats = {
  /** Публичных репозиториев в каталоге. */
  total: number;
  /** Из них могут претендовать на место: не форк, не зеркало, не шаблон, не пустой. */
  eligible: number;
  /** Сколько репозиториев каталога уже оценено и опубликовано. */
  analyzed: number;
  syncedAt: string | null;
};

export async function getCatalogStats(db: Db): Promise<CatalogStats | null> {
  const result = await db.execute<{
    total: number;
    eligible: number;
    analyzed: number;
    synced_at: string | Date | null;
  }>(sql`
    select
      count(*)::int as total,
      count(*) filter (where not c.is_fork and not c.is_mirror and not c.is_template and not c.is_empty)::int as eligible,
      count(*) filter (where exists (
        select 1 from repositories r
        join analyses a on a.repository_id = r.id
        where lower(r.org_slug) = lower(c.org_slug)
          and lower(r.repo_slug) = lower(c.repo_slug)
          and a.is_public and a.status = 'done'
      ))::int as analyzed,
      max(c.synced_at) as synced_at
    from catalog_repositories c
  `);
  const row = result.rows[0];
  if (!row || row.total === 0) return null;
  const synced = row.synced_at ? new Date(row.synced_at) : null;
  return {
    total: row.total,
    eligible: row.eligible,
    analyzed: row.analyzed,
    syncedAt: synced && !Number.isNaN(synced.getTime()) ? synced.toISOString() : null,
  };
}

// ---------- Фоновая оценка каталога ----------

/**
 * Следующие неоценённые репозитории каталога: сначала самые залайканные, потом
 * недавно обновлённые. Форки, зеркала, шаблоны и пустые пропускаем — места в
 * рейтинге им всё равно не положено. «Неоценённый» — без единого анализа:
 * упавший прогон тоже считается обработанным, повторно его не берём.
 */
export async function nextCatalogCandidates(
  db: DbOrTx,
  limit: number,
): Promise<{ org: string; repo: string; likes: number | null }[]> {
  return db
    .select({
      org: catalogRepositories.orgSlug,
      repo: catalogRepositories.repoSlug,
      likes: catalogRepositories.likes,
    })
    .from(catalogRepositories)
    .where(
      and(
        eq(catalogRepositories.isFork, false),
        eq(catalogRepositories.isMirror, false),
        eq(catalogRepositories.isTemplate, false),
        eq(catalogRepositories.isEmpty, false),
        // Сырым SQL: drizzle теряет имя таблицы в коррелированном подзапросе.
        sql`not exists (
          select 1 from repositories r
          join analyses a on a.repository_id = r.id
          where lower(r.org_slug) = lower("catalog_repositories"."org_slug")
            and lower(r.repo_slug) = lower("catalog_repositories"."repo_slug")
        )`,
      ),
    )
    .orderBy(
      sql`${catalogRepositories.likes} desc nulls last`,
      sql`${catalogRepositories.lastUpdatedAt} desc nulls last`,
    )
    .limit(limit);
}

/** Через сколько дней публичная оценка считается устаревшей (ТЗ, раздел 6). */
export function publicRefreshDays(): number {
  const raw = Number.parseInt(process.env.PUBLIC_REFRESH_DAYS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 7;
}

/**
 * Опубликованные оценки, которые пора пересчитать: репозиторий изменился
 * после анализа (по last_updated из каталога) или оценке больше
 * PUBLIC_REFRESH_DAYS дней. Изменившиеся — первыми, потом самые старые.
 *
 * Не берём репозиторий, если по нему уже идёт прогон или прогон заводили за
 * последние сутки: упавший пересчёт не должен повторяться каждую минуту, а
 * прежняя оценка остаётся в рейтинге, пока новая не досчитана.
 */
export async function nextRefreshCandidates(
  db: DbOrTx,
  limit: number,
): Promise<{ org: string; repo: string }[]> {
  const days = publicRefreshDays();
  const result = await db.execute<{ org: string; repo: string }>(sql`
    select r.org_slug as org, r.repo_slug as repo
    from analyses a
    join repositories r on r.id = a.repository_id
    join catalog_repositories c
      on lower(c.org_slug) = lower(r.org_slug) and lower(c.repo_slug) = lower(r.repo_slug)
    where a.is_public and a.status = 'done' and not r.is_private
      and (a.metrics -> 'rating' ->> 'excluded') is null
      and a.finished_at < now() - interval '1 day'
      and (
        a.finished_at < now() - make_interval(days => ${days}::int)
        or c.last_updated_at > a.finished_at
      )
      and not exists (
        select 1 from analyses q
        where q.repository_id = r.id
          and (q.status in ('queued', 'running') or q.created_at > now() - interval '1 day')
      )
    order by (c.last_updated_at > a.finished_at) desc nulls last, a.finished_at asc
    limit ${limit}
  `);
  return result.rows;
}

/**
 * Ставит на пересчёт до `limit` устаревших публичных оценок. Новый прогон
 * публичный и по завершении сам снимает прежний с публикации (lib/analysis/run).
 */
export async function enqueuePublicRefresh(db: Db, limit: number): Promise<number> {
  if (limit <= 0) return 0;
  let queued = 0;
  for (const { org, repo } of await nextRefreshCandidates(db, limit)) {
    if (await createCatalogJob(db, org, repo)) queued += 1;
  }
  return queued;
}

/**
 * Заводит анализ и задачу для репозитория каталога. Оценка публичного
 * репозитория по публичным данным сразу публикуется: это и есть публичный
 * рейтинг из ТЗ.
 */
async function createCatalogJob(db: DbOrTx, org: string, repo: string): Promise<string | null> {
  const existing = await db.query.repositories.findFirst({
    where: and(eq(repositories.orgSlug, org), eq(repositories.repoSlug, repo)),
  });
  let repositoryId = existing?.id;
  if (!repositoryId) {
    const [inserted] = await db
      .insert(repositories)
      .values({ orgSlug: org, repoSlug: repo })
      .onConflictDoNothing()
      .returning({ id: repositories.id });
    repositoryId = inserted?.id;
  }
  if (!repositoryId) return null;
  const [analysis] = await db
    .insert(analyses)
    .values({ repositoryId, status: 'queued', isPublic: true })
    .returning({ id: analyses.id });
  if (!analysis) return null;
  await db.insert(analysisJobs).values({ analysisId: analysis.id });
  return analysis.id;
}

/**
 * Ставит в очередь до `limit` ещё не оценённых репозиториев каталога. Каждая
 * оценка стоит клона и вызовов модели, поэтому по умолчанию выключено
 * (CATALOG_AUTO_ANALYZE=0).
 */
export async function enqueueCatalogAnalyses(db: Db, limit: number): Promise<number> {
  if (limit <= 0) return 0;
  let queued = 0;
  for (const { org, repo } of await nextCatalogCandidates(db, limit)) {
    if (await createCatalogJob(db, org, repo)) queued += 1;
  }
  return queued;
}

// ---------- Прогон каталога из админки ----------
//
// Флаг в settings ставят и снимают кнопки «Старт» и «Стоп». Диспетчер
// (/api/cron/catalog-run) перед каждым новым репозиторием перечитывает флаг и
// держит не больше CATALOG_CONCURRENCY оценок одновременно; каждая оценка —
// отдельная функция /api/analyses/<id>/run. «Стоп» не прерывает начатые:
// они доходят до конца, новые не берутся.

const RUNNING_KEY = 'catalog.running';
/** Повтор MAX_ATTEMPTS из lib/analysis/run: импорт потянул бы весь конвейер анализа в рейтинг. */
const MAX_ATTEMPTS = 3;
/** Сколько репозиториев каталога считается одновременно. */
export const CATALOG_CONCURRENCY = 3;

export async function isCatalogRunning(db: DbOrTx): Promise<boolean> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, RUNNING_KEY) });
  return row?.value === true;
}

export async function setCatalogRunning(db: Db, running: boolean): Promise<void> {
  const value = running as unknown as Record<string, unknown>;
  await db
    .insert(settings)
    .values({ key: RUNNING_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** Задача анализа репозитория из каталога (j — analysis_jobs). */
const catalogJobSql = sql`exists (
  select 1 from analyses a
  join repositories r on r.id = a.repository_id
  join catalog_repositories c
    on lower(c.org_slug) = lower(r.org_slug) and lower(c.repo_slug) = lower(r.repo_slug)
  where a.id = j.analysis_id
)`;

/**
 * Задача занята: её считают прямо сейчас (свежий лок) или её только что
 * отдали на запуск и она вот-вот будет захвачена. Лок старше шести минут —
 * брошенный, как и в lib/analysis/run.
 */
const busyJobSql = sql`(
  j.locked_at > now() - interval '6 minutes'
  or (j.locked_at is null and j.created_at > now() - interval '2 minutes')
)`;

/**
 * Выбирает, что запустить следующим, и возвращает id анализа. null — прогон
 * выключен, заняты все слоты или каталог кончился.
 *
 * Сначала брошенные и вернувшиеся в очередь задачи каталога, потом новый
 * неоценённый репозиторий. Всё под advisory-локом: два диспетчера, пришедшие
 * одновременно (крон и открытая админка), не превысят число слотов и не
 * возьмут один репозиторий дважды.
 */
export async function dispatchCatalogJob(db: Db): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('catalog.dispatch'))`);
    if (!(await isCatalogRunning(tx))) return null;

    const busy = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count from analysis_jobs j
      where ${catalogJobSql} and ${busyJobSql} and j.attempts < ${MAX_ATTEMPTS}
    `);
    if ((busy.rows[0]?.count ?? 0) >= CATALOG_CONCURRENCY) return null;

    const stale = await tx.execute<{ id: string; analysis_id: string }>(sql`
      select j.id, j.analysis_id from analysis_jobs j
      where ${catalogJobSql} and not ${busyJobSql} and j.attempts < ${MAX_ATTEMPTS}
      order by j.created_at asc
      limit 1
    `);
    const retry = stale.rows[0];
    if (retry) {
      // Свежий created_at помечает задачу занятой, пока её не захватит запуск.
      await tx
        .update(analysisJobs)
        .set({ lockedAt: null, lockedBy: null, createdAt: new Date() })
        .where(eq(analysisJobs.id, retry.id));
      return retry.analysis_id;
    }

    const [next] = await nextCatalogCandidates(tx, 1);
    if (next) return createCatalogJob(tx, next.org, next.repo);
    // Новые кончились — пересчитываем устаревшие оценки.
    const [stalePublic] = await nextRefreshCandidates(tx, 1);
    if (!stalePublic) return null;
    return createCatalogJob(tx, stalePublic.org, stalePublic.repo);
  });
}

/**
 * Диспетчер планового пересчёта (/api/cron/refresh-public): как
 * dispatchCatalogJob, но без кнопки «Старт» в админке и только по
 * устаревшим публичным оценкам. Слоты общие с прогоном каталога.
 */
export async function dispatchRefreshJob(db: Db): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('catalog.dispatch'))`);
    const busy = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count from analysis_jobs j
      where ${catalogJobSql} and ${busyJobSql} and j.attempts < ${MAX_ATTEMPTS}
    `);
    if ((busy.rows[0]?.count ?? 0) >= CATALOG_CONCURRENCY) return null;
    const [next] = await nextRefreshCandidates(tx, 1);
    if (!next) return null;
    return createCatalogJob(tx, next.org, next.repo);
  });
}

export type CatalogRunRow = {
  analysisId: string;
  orgRepo: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  stage: string | null;
  score: number | null;
  error: string | null;
  at: string;
};

export type CatalogProgress = {
  running: boolean;
  total: number;
  eligible: number;
  done: number;
  failed: number;
  inProgress: number;
  /** Ещё не тронуты: подходят в рейтинг и без единого анализа. */
  remaining: number;
  syncedAt: string | null;
  active: CatalogRunRow[];
  recent: CatalogRunRow[];
  next: { org: string; repo: string; likes: number | null }[];
};

type RunDbRow = {
  id: string;
  org_slug: string;
  repo_slug: string;
  status: CatalogRunRow['status'];
  stage: string | null;
  score: number | null;
  error: string | null;
  at: string | Date;
};

/** Анализы репозиториев из каталога — для списков «в работе» и «последние». */
async function catalogRuns(db: Db, finished: boolean, limit: number): Promise<CatalogRunRow[]> {
  const result = await db.execute<RunDbRow>(sql`
    select a.id, r.org_slug, r.repo_slug, a.status, a.stage, a.score, a.error,
      coalesce(a.finished_at, a.created_at) as at
    from analyses a
    join repositories r on r.id = a.repository_id
    where ${finished ? sql`a.status in ('done', 'failed')` : sql`a.status in ('queued', 'running')`}
      and exists (
        select 1 from catalog_repositories c
        where lower(c.org_slug) = lower(r.org_slug) and lower(c.repo_slug) = lower(r.repo_slug)
      )
    order by ${finished ? sql`a.finished_at desc nulls last` : sql`a.created_at asc`}
    limit ${limit}
  `);
  return result.rows.map((r) => ({
    analysisId: r.id,
    orgRepo: `${r.org_slug}/${r.repo_slug}`,
    status: r.status,
    stage: r.stage,
    score: r.score,
    error: r.error,
    at: new Date(r.at).toISOString(),
  }));
}

export async function getCatalogProgress(db: Db): Promise<CatalogProgress> {
  // По каждому репозиторию каталога — статус его последнего анализа.
  const counts = await db.execute<{
    total: number;
    eligible: number;
    done: number;
    failed: number;
    in_progress: number;
    remaining: number;
    synced_at: string | Date | null;
  }>(sql`
    with last as (
      select distinct on (lower(r.org_slug), lower(r.repo_slug))
        lower(r.org_slug) as org, lower(r.repo_slug) as repo, a.status
      from repositories r
      join analyses a on a.repository_id = r.id
      order by lower(r.org_slug), lower(r.repo_slug), a.created_at desc
    ),
    c as (
      select
        not c.is_fork and not c.is_mirror and not c.is_template and not c.is_empty as eligible,
        last.status as last_status,
        c.synced_at
      from catalog_repositories c
      left join last on last.org = lower(c.org_slug) and last.repo = lower(c.repo_slug)
    )
    select
      count(*)::int as total,
      count(*) filter (where eligible)::int as eligible,
      count(*) filter (where last_status = 'done')::int as done,
      count(*) filter (where last_status = 'failed')::int as failed,
      count(*) filter (where last_status in ('queued', 'running'))::int as in_progress,
      count(*) filter (where eligible and last_status is null)::int as remaining,
      max(synced_at) as synced_at
    from c
  `);

  const [active, recent, next, running] = await Promise.all([
    catalogRuns(db, false, 20),
    catalogRuns(db, true, 20),
    nextCatalogCandidates(db, 10),
    isCatalogRunning(db),
  ]);

  const row = counts.rows[0];
  const synced = row?.synced_at ? new Date(row.synced_at) : null;
  return {
    running,
    total: row?.total ?? 0,
    eligible: row?.eligible ?? 0,
    done: row?.done ?? 0,
    failed: row?.failed ?? 0,
    inProgress: row?.in_progress ?? 0,
    remaining: row?.remaining ?? 0,
    syncedAt: synced && !Number.isNaN(synced.getTime()) ? synced.toISOString() : null,
    active,
    recent,
    next,
  };
}
