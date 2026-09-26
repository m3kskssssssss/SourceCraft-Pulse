// Лимиты пользователей на запуск анализов.
//
// Константы — значения по умолчанию; поверх них действуют настройки из
// админки (`limits.user_daily`, `limits.user_concurrent`). Раньше поля в
// админке сохранялись, но проверка всё равно смотрела в константы.

import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses } from '@/db/schema';
import { getNumberSetting } from './settings';

export const USER_DAILY_ANALYSIS_LIMIT = 10;
export const USER_CONCURRENT_ANALYSIS_LIMIT = 3;

export type UserLimits = { daily: number; concurrent: number };

export async function getUserLimits(): Promise<UserLimits> {
  const [daily, concurrent] = await Promise.all([
    getNumberSetting('limits.user_daily', 'USER_DAILY_ANALYSIS_LIMIT', USER_DAILY_ANALYSIS_LIMIT),
    getNumberSetting(
      'limits.user_concurrent',
      'USER_CONCURRENT_ANALYSIS_LIMIT',
      USER_CONCURRENT_ANALYSIS_LIMIT,
    ),
  ]);
  return { daily: Math.max(1, Math.floor(daily)), concurrent: Math.max(1, Math.floor(concurrent)) };
}

export const LIMIT_MESSAGES = {
  daily: (limit: number) => `Дневной лимит: ${limit} анализов. Попробуйте завтра.`,
  concurrent: (limit: number) =>
    `У вас уже ${limit} анализов в очереди. Дождитесь завершения текущих.`,
} as const;

/** Текст ошибки, если пользователь упёрся в лимит; null — можно запускать. */
export async function checkUserLimits(userId: string): Promise<string | null> {
  const limits = await getUserLimits();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const [daily] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .where(and(eq(analyses.requestedBy, userId), gte(analyses.createdAt, dayAgo)));
  if ((daily?.count ?? 0) >= limits.daily) return LIMIT_MESSAGES.daily(limits.daily);
  const [running] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .where(and(eq(analyses.requestedBy, userId), inArray(analyses.status, ['queued', 'running'])));
  if ((running?.count ?? 0) >= limits.concurrent) return LIMIT_MESSAGES.concurrent(limits.concurrent);
  return null;
}
