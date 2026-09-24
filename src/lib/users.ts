// Профили пользователей из базы. Всё, что не требует запроса — имя,
// инициалы, разбор контактов — лежит в user-display.ts: тот файл читают и
// клиентские компоненты, а сюда им нельзя, здесь драйвер Postgres.

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, analysisComments, analysisRatings, users } from '@/db/schema';
import { displayNameOf, splitContacts, isUuid, type PublicUser } from './user-display';
import { parseContactLinks } from './contacts';

export { displayNameOf, splitContacts, isUuid, initialsOf } from './user-display';
export type { PublicUser } from './user-display';

/** Строка users → публичный профиль. Ничего приватного наружу не отдаёт. */
type UserRow = {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  bio: string | null;
  contacts: string | null;
  contactLinks: unknown;
  avatarMime: string | null;
  avatarUpdatedAt: Date | null;
  createdAt: Date;
};

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    displayName: displayNameOf(row),
    nickname: row.nickname ?? null,
    name: row.name ?? null,
    bio: row.bio ?? null,
    contacts: parseContactLinks(row.contactLinks),
    // Свободный текст показываем, только пока его не заменили сетями.
    legacyContacts: splitContacts(row.contacts),
    hasAvatar: Boolean(row.avatarMime),
    avatarVersion: row.avatarUpdatedAt ? String(row.avatarUpdatedAt.getTime()) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

const PUBLIC_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  nickname: users.nickname,
  bio: users.bio,
  contacts: users.contacts,
  contactLinks: users.contactLinks,
  avatarMime: users.avatarMime,
  avatarUpdatedAt: users.avatarUpdatedAt,
  createdAt: users.createdAt,
} as const;

export async function getPublicUser(id: string): Promise<PublicUser | null> {
  if (!isUuid(id)) return null;
  const rows = await db.select(PUBLIC_COLUMNS).from(users).where(eq(users.id, id)).limit(1);
  const row = rows[0];
  return row ? toPublicUser(row) : null;
}

/**
 * Профили пачкой по списку id. Нужно ленте комментариев: иначе на каждый
 * комментарий уходил бы отдельный запрос.
 */
export async function getPublicUsers(ids: string[]): Promise<Map<string, PublicUser>> {
  const unique = [...new Set(ids.filter(isUuid))];
  if (unique.length === 0) return new Map();
  const rows = await db.select(PUBLIC_COLUMNS).from(users).where(inArray(users.id, unique));
  return new Map(rows.map((row) => [row.id, toPublicUser(row)]));
}

/** Пользователь из внешнего запроса — для коррелированных подзапросов. */
const OUTER_USER_ID = sql.raw('"users"."id"');

export type UserListSort = 'active' | 'new';

export type UserListItem = PublicUser & {
  /** Разных репозиториев в опубликованных анализах. */
  repos: number;
  comments: number;
  ratings: number;
  /** Очки активности: репозиторий весит как три комментария или оценки. */
  points: number;
  /** Последнее публичное действие: опубликованный анализ, комментарий, оценка. */
  lastActiveAt: string | null;
};

/** Сколько очков даёт каждое действие — одна формула для сортировки и званий. */
export const POINTS = { repo: 3, comment: 1, rating: 1 } as const;

/**
 * Список людей для вкладки «Пользователи». Заблокированных не показываем.
 *
 * Ищем по нику, ФИО и логину — части почты до «@», которая и так служит
 * подписью, если имени нет. По полному адресу искать нельзя: так можно было
 * бы проверять, зарегистрирована ли чужая почта.
 */
export async function listUsers(params: {
  query?: string;
  sort?: UserListSort;
  limit: number;
  offset: number;
}): Promise<{ items: UserListItem[]; total: number }> {
  const q = params.query?.trim();
  // % и _ в запросе — обычные символы, а не шаблон ilike.
  const pattern = q ? `%${q.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%` : null;
  const where = and(
    isNull(users.blockedAt),
    pattern
      ? sql`(${users.nickname} ilike ${pattern} or ${users.name} ilike ${pattern} or split_part(${users.email}, '@', 1) ilike ${pattern})`
      : undefined,
  );

  // Внешняя ссылка на пользователя пишется с именем таблицы руками: в запросе
  // из одной таблицы drizzle снимает имена таблиц с колонок в полях выборки,
  // и users.id внутри подзапроса молча становится id анализа — счётчики
  // выходили нулями.
  const repos = sql<number>`(
    select count(distinct ${analyses.repositoryId})::int from ${analyses}
    where ${analyses.requestedBy} = ${OUTER_USER_ID} and ${analyses.isPublic}
  )`;
  const comments = sql<number>`(
    select count(*)::int from ${analysisComments}
    where ${analysisComments.userId} = ${OUTER_USER_ID} and ${analysisComments.deletedAt} is null
  )`;
  const ratings = sql<number>`(
    select count(*)::int from ${analysisRatings}
    where ${analysisRatings.userId} = ${OUTER_USER_ID}
  )`;

  // Приватные прогоны в дату не входят: по ней нельзя догадаться о них.
  const lastActive = sql<Date | null>`greatest(
    (select max(${analyses.finishedAt}) from ${analyses}
      where ${analyses.requestedBy} = ${OUTER_USER_ID} and ${analyses.isPublic}),
    (select max(${analysisComments.createdAt}) from ${analysisComments}
      where ${analysisComments.userId} = ${OUTER_USER_ID} and ${analysisComments.deletedAt} is null),
    (select max(${analysisRatings.updatedAt}) from ${analysisRatings}
      where ${analysisRatings.userId} = ${OUTER_USER_ID})
  )`;
  const points = sql<number>`(${repos} * ${sql.raw(String(POINTS.repo))} + ${comments} * ${sql.raw(String(POINTS.comment))} + ${ratings} * ${sql.raw(String(POINTS.rating))})`;

  const [rows, totalRows] = await Promise.all([
    db
      .select({ ...PUBLIC_COLUMNS, repos, comments, ratings, points, lastActive })
      .from(users)
      .where(where)
      .orderBy(
        ...(params.sort === 'new'
          ? [desc(users.createdAt)]
          : [desc(points), desc(users.createdAt)]),
      )
      .limit(params.limit)
      .offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(where),
  ]);

  return {
    items: rows.map((row) => ({
      ...toPublicUser(row),
      repos: row.repos ?? 0,
      comments: row.comments ?? 0,
      ratings: row.ratings ?? 0,
      points: row.points ?? 0,
      lastActiveAt: row.lastActive ? new Date(row.lastActive).toISOString() : null,
    })),
    total: totalRows[0]?.count ?? 0,
  };
}

export type UsersOverview = {
  total: number;
  /** Отправили хотя бы один репозиторий в рейтинг. */
  contributors: number;
  /** Оставили хотя бы один комментарий. */
  commenters: number;
  /** Зарегистрировались за последние 30 дней. */
  newLast30: number;
};

export async function getUsersOverview(): Promise<UsersOverview> {
  const active = isNull(users.blockedAt);
  const [total, contributors, commenters, fresh] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(active),
    db
      .select({ count: sql<number>`count(distinct ${analyses.requestedBy})::int` })
      .from(analyses)
      .innerJoin(users, eq(users.id, analyses.requestedBy))
      .where(and(active, eq(analyses.isPublic, true))),
    db
      .select({ count: sql<number>`count(distinct ${analysisComments.userId})::int` })
      .from(analysisComments)
      .innerJoin(users, eq(users.id, analysisComments.userId))
      .where(and(active, isNull(analysisComments.deletedAt))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(active, sql`${users.createdAt} > now() - interval '30 days'`)),
  ]);
  return {
    total: total[0]?.count ?? 0,
    contributors: contributors[0]?.count ?? 0,
    commenters: commenters[0]?.count ?? 0,
    newLast30: fresh[0]?.count ?? 0,
  };
}

/** Аватар как есть: байты и тип. Отдаётся маршрутом /api/users/[id]/avatar. */
export async function getAvatarBytes(
  id: string,
): Promise<{ data: Buffer; mime: string; version: string } | null> {
  if (!isUuid(id)) return null;
  const rows = await db
    .select({
      data: users.avatarData,
      mime: users.avatarMime,
      updatedAt: users.avatarUpdatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  const row = rows[0];
  if (!row?.data || !row.mime) return null;
  return {
    data: row.data,
    mime: row.mime,
    version: row.updatedAt ? String(row.updatedAt.getTime()) : '0',
  };
}

/** Профиль текущего пользователя для формы настроек — вместе с почтой. */
export async function getOwnProfile(id: string): Promise<(PublicUser & { email: string }) | null> {
  if (!isUuid(id)) return null;
  const rows = await db.select(PUBLIC_COLUMNS).from(users).where(eq(users.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...toPublicUser(row), email: row.email };
}
