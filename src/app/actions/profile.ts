'use server';

// Настройки профиля: как подписываться, что о себе рассказать, фото и пароль.
//
// Фото лежит в самой базе (users.avatar_data). На Vercel Hobby постоянного
// диска нет, а отдельное хранилище ради одной картинки на человека — лишний
// сервис в стеке. Поэтому размер ограничен жёстко, а картинку перед отправкой
// ужимает браузер.

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { users } from '@/db/schema';

export type ProfileState = { ok: boolean; error?: string; savedAt?: string };

/** Больше этого в базу не кладём. Браузер ужимает картинку до отправки. */
export const MAX_AVATAR_BYTES = 256 * 1024;

const ALLOWED_AVATAR_MIME = ['image/png', 'image/jpeg', 'image/webp'];

const profileSchema = z.object({
  nickname: z
    .string()
    .trim()
    .max(40, 'Ник до 40 символов')
    .optional()
    .transform((v) => (v ? v : null)),
  name: z
    .string()
    .trim()
    .max(120, 'ФИО до 120 символов')
    .optional()
    .transform((v) => (v ? v : null)),
  bio: z
    .string()
    .trim()
    .max(2000, 'О себе до 2000 символов')
    .optional()
    .transform((v) => (v ? v : null)),
  contacts: z
    .string()
    .trim()
    .max(600, 'Контакты до 600 символов')
    .optional()
    .transform((v) => (v ? v : null)),
});

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function updateProfileAction(
  _prev: ProfileState | undefined,
  formData: FormData,
): Promise<ProfileState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Нужен вход' };

  const parsed = profileSchema.safeParse({
    nickname: formData.get('nickname')?.toString() ?? undefined,
    name: formData.get('name')?.toString() ?? undefined,
    bio: formData.get('bio')?.toString() ?? undefined,
    contacts: formData.get('contacts')?.toString() ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Проверьте форму' };
  }

  await db
    .update(users)
    .set({
      nickname: parsed.data.nickname,
      name: parsed.data.name,
      bio: parsed.data.bio,
      contacts: normalizeContacts(parsed.data.contacts),
    })
    .where(eq(users.id, userId));

  revalidateProfile(userId);
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function uploadAvatarAction(
  _prev: ProfileState | undefined,
  formData: FormData,
): Promise<ProfileState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Нужен вход' };

  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Выберите файл' };
  }
  if (!ALLOWED_AVATAR_MIME.includes(file.type)) {
    return { ok: false, error: 'Годятся PNG, JPEG и WebP' };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: `Файл больше ${Math.round(MAX_AVATAR_BYTES / 1024)} КБ` };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await db
    .update(users)
    .set({ avatarData: bytes, avatarMime: file.type, avatarUpdatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidateProfile(userId);
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function removeAvatarAction(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await db
    .update(users)
    .set({ avatarData: null, avatarMime: null, avatarUpdatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidateProfile(userId);
}

const passwordSchema = z
  .object({
    current: z.string().min(1, 'Введите текущий пароль'),
    next: z.string().min(8, 'Новый пароль от 8 символов').max(200),
    repeat: z.string(),
  })
  .refine((v) => v.next === v.repeat, { message: 'Новые пароли не совпадают' });

export async function changePasswordAction(
  _prev: ProfileState | undefined,
  formData: FormData,
): Promise<ProfileState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Нужен вход' };

  const parsed = passwordSchema.safeParse({
    current: formData.get('current') ?? '',
    next: formData.get('next') ?? '',
    repeat: formData.get('repeat') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Проверьте форму' };
  }

  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const hash = rows[0]?.passwordHash;
  if (!hash) return { ok: false, error: 'У этой учётной записи нет пароля' };

  const ok = await argon2.verify(hash, parsed.data.current);
  if (!ok) return { ok: false, error: 'Текущий пароль не подходит' };

  const nextHash = await argon2.hash(parsed.data.next, { type: argon2.argon2id });
  await db.update(users).set({ passwordHash: nextHash }).where(eq(users.id, userId));

  return { ok: true, savedAt: new Date().toISOString() };
}

/** Контакты храним построчно: не больше десяти строк, пустые выбрасываем. */
function normalizeContacts(raw: string | null): string | null {
  if (!raw) return null;
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10);
  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Имя и фото видно не только в профиле, но и под каждым комментарием, и в
 * шапке. Все эти страницы динамические, но кэш маршрутизатора живёт своей
 * жизнью — сбрасываем его явно.
 */
function revalidateProfile(userId: string): void {
  revalidatePath('/profile');
  revalidatePath(`/u/${userId}`);
  revalidatePath('/', 'layout');
}
