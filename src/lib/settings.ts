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
  | 'limits.user_concurrent'
  /** ISO-дата, с которой считаются расходы на ИИ. Ставится кнопкой «сбросить». */
  | 'ai.spend_reset_at';

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

/**
 * Число из настроек с откатом на переменную окружения, а потом на дефолт.
 * Настройки живут в БД, и если она недоступна (CLI без подключения), молча
 * возвращаем то, что знаем из окружения.
 */
export async function getNumberSetting(
  key: KnownSettingKey,
  envName: string,
  fallback: number,
): Promise<number> {
  const fromEnv = Number.parseFloat(process.env[envName] ?? '');
  const base = Number.isFinite(fromEnv) ? fromEnv : fallback;
  try {
    const value = await getSetting<number>(key, base);
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : base;
  } catch {
    return base;
  }
}

/** С какого момента считаем расходы на ИИ. null — с начала месяца. */
export async function getSpendResetAt(): Promise<Date | null> {
  try {
    const raw = await getSetting<string>('ai.spend_reset_at', '');
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
