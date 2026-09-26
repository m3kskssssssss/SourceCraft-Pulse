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
import { analyses, analysisJobs, catalogRepositories, repositories } from '../db/schema';
import { getSourcecraftClient, type Repository, type SourcecraftClient } from './sourcecraft/client';

type Db = NodePgDatabase<typeof schema>;

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
 * Ставит в очередь до `limit` ещё не оценённых репозиториев каталога: сначала
 * самые залайканные, потом недавно обновлённые. Форки, зеркала, шаблоны и
 * пустые пропускаем — места в рейтинге им всё равно не положено.
 *
 * Оценка публичного репозитория по публичным данным сразу публикуется: это и
 * есть публичный рейтинг из ТЗ. Каждая стоит клона и вызовов модели, поэтому
 * по умолчанию выключено (CATALOG_AUTO_ANALYZE=0).
 */
export async function enqueueCatalogAnalyses(db: Db, limit: number): Promise<number> {
  if (limit <= 0) return 0;
  const candidates = await db
    .select({ org: catalogRepositories.orgSlug, repo: catalogRepositories.repoSlug })
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

  let queued = 0;
  for (const { org, repo } of candidates) {
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
    if (!repositoryId) continue;
    const [analysis] = await db
      .insert(analyses)
      .values({ repositoryId, status: 'queued', isPublic: true })
      .returning({ id: analyses.id });
    if (!analysis) continue;
    await db.insert(analysisJobs).values({ analysisId: analysis.id });
    queued += 1;
  }
  return queued;
}
