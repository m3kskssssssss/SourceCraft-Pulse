// Профили пользователей из базы. Всё, что не требует запроса — имя,
// инициалы, разбор контактов — лежит в user-display.ts: тот файл читают и
// клиентские компоненты, а сюда им нельзя, здесь драйвер Postgres.

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
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
