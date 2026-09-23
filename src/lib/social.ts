// Оценки и обсуждение анализов: чтение. Запись — в app/actions/social.ts.
//
// Две сущности, обе привязаны к одному прогону: звёзды (одна на пользователя)
// и комментарии с одним уровнем ответов. Рейтинг на главной берёт отсюда же
// агрегаты, поэтому они вынесены в отдельные функции и считаются пачкой.

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { analysisComments, analysisRatings } from '@/db/schema';
import { getPublicUsers } from './users';
import type { PublicUser } from './user-display';
import { EMPTY_SOCIAL, type AnalysisSocial } from './social-shared';

export { MAX_RATING, EMPTY_SOCIAL } from './social-shared';
export type { AnalysisSocial, RatingSummary } from './social-shared';

import type { RatingSummary } from './social-shared';

export type CommentNode = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  author: PublicUser | null;
  replies: CommentNode[];
};

// ---------- Оценки ----------

export async function getRatingSummary(
  analysisId: string,
  viewerId: string | null,
): Promise<RatingSummary> {
  const [aggregate, mine] = await Promise.all([
    db
      .select({
        avg: sql<string>`coalesce(avg(${analysisRatings.value}), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(analysisRatings)
      .where(eq(analysisRatings.analysisId, analysisId)),
    viewerId
      ? db
          .select({ value: analysisRatings.value })
          .from(analysisRatings)
          .where(
            and(
              eq(analysisRatings.analysisId, analysisId),
              eq(analysisRatings.userId, viewerId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const count = aggregate[0]?.count ?? 0;
  const average = count > 0 ? round1(Number.parseFloat(aggregate[0]?.avg ?? '0')) : null;
  return { average, count, mine: mine[0]?.value ?? null };
}

// ---------- Комментарии ----------

/**
 * Вся ветка обсуждения разом: корни по времени, ответы под ними. Авторы
 * подтягиваются одним запросом — иначе на каждый комментарий был бы свой.
 */
export async function getCommentTree(analysisId: string): Promise<CommentNode[]> {
  const rows = await db
    .select({
      id: analysisComments.id,
      userId: analysisComments.userId,
      parentId: analysisComments.parentId,
      body: analysisComments.body,
      deletedAt: analysisComments.deletedAt,
      createdAt: analysisComments.createdAt,
      updatedAt: analysisComments.updatedAt,
    })
    .from(analysisComments)
    .where(eq(analysisComments.analysisId, analysisId))
    .orderBy(asc(analysisComments.createdAt))
    .limit(500);

  const authors = await getPublicUsers(rows.map((r) => r.userId));

  const toNode = (row: (typeof rows)[number]): CommentNode => ({
    id: row.id,
    // Удалённый комментарий остаётся в дереве пустой строкой: без него
    // ответы повисли бы без вопроса.
    body: row.deletedAt ? '' : row.body,
    createdAt: row.createdAt.toISOString(),
    editedAt:
      !row.deletedAt && row.updatedAt.getTime() - row.createdAt.getTime() > 1000
        ? row.updatedAt.toISOString()
        : null,
    deleted: Boolean(row.deletedAt),
    author: row.deletedAt ? null : authors.get(row.userId) ?? null,
    replies: [],
  });

  const roots: CommentNode[] = [];
  const byId = new Map<string, CommentNode>();

  for (const row of rows) {
    if (row.parentId) continue;
    const node = toNode(row);
    byId.set(row.id, node);
    roots.push(node);
  }
  for (const row of rows) {
    if (!row.parentId) continue;
    const parent = byId.get(row.parentId);
    // Ответ на исчезнувший корень показываем как самостоятельный: потерять
    // текст хуже, чем нарушить вложенность.
    if (parent) parent.replies.push(toNode(row));
    else roots.push(toNode(row));
  }

  return roots;
}

export async function getCommentCount(analysisId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analysisComments)
    .where(and(eq(analysisComments.analysisId, analysisId), isNull(analysisComments.deletedAt)));
  return rows[0]?.count ?? 0;
}

// ---------- Агрегаты пачкой ----------

/**
 * Оценки и число комментариев для списка анализов. Два запроса на всю
 * страницу рейтинга вместо двух на строку.
 */
export async function getSocialByAnalysis(
  analysisIds: string[],
): Promise<Map<string, AnalysisSocial>> {
  const ids = [...new Set(analysisIds)];
  const result = new Map<string, AnalysisSocial>();
  if (ids.length === 0) return result;

  const [ratings, comments] = await Promise.all([
    db
      .select({
        analysisId: analysisRatings.analysisId,
        avg: sql<string>`avg(${analysisRatings.value})::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(analysisRatings)
      .where(inArray(analysisRatings.analysisId, ids))
      .groupBy(analysisRatings.analysisId),
    db
      .select({
        analysisId: analysisComments.analysisId,
        count: sql<number>`count(*)::int`,
      })
      .from(analysisComments)
      .where(
        and(inArray(analysisComments.analysisId, ids), isNull(analysisComments.deletedAt)),
      )
      .groupBy(analysisComments.analysisId),
  ]);

  for (const id of ids) result.set(id, { ...EMPTY_SOCIAL });
  for (const row of ratings) {
    const entry = result.get(row.analysisId);
    if (!entry) continue;
    entry.ratingAverage = round1(Number.parseFloat(row.avg));
    entry.ratingCount = row.count;
  }
  for (const row of comments) {
    const entry = result.get(row.analysisId);
    if (entry) entry.commentCount = row.count;
  }

  return result;
}

/** Сколько всего оценок и комментариев оставил пользователь — для профиля. */
export async function getUserActivityCounts(
  userId: string,
): Promise<{ ratings: number; comments: number }> {
  const [ratings, comments] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(analysisRatings)
      .where(eq(analysisRatings.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(analysisComments)
      .where(and(eq(analysisComments.userId, userId), isNull(analysisComments.deletedAt))),
  ]);
  return { ratings: ratings[0]?.count ?? 0, comments: comments[0]?.count ?? 0 };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
