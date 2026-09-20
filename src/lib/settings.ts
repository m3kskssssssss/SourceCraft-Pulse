// Настройки в БД поверх переменных окружения. Значения кладутся в jsonb.
// Если ключа нет — используется значение из env (или дефолт).
//
// Пока хранение простое: без in-memory-кэша, потому что чтения нечастые.

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { settings } from '@/db/schema';

export type KnownSettingKey =
  | 'ai.model'
  | 'ai.monthly_budget_rub'
  | 'limits.user_daily'
  | 'limits.user_concurrent';

const settingValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export async function getSetting<T = string>(key: KnownSettingKey, fallback: T): Promise<T> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  if (!row) return fallback;
  const parsed = settingValueSchema.safeParse(row.value);
  if (!parsed.success) return fallback;
  return parsed.data as unknown as T;
}

export async function setSetting(key: KnownSettingKey, value: string | number | boolean): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value: value as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as unknown as Record<string, unknown>, updatedAt: new Date() } });
}
