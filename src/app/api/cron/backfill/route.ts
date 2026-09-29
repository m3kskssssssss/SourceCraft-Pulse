// POST|GET /api/cron/backfill — догрузка дополнительной аналитики в уже
// посчитанные публичные анализы: сводка ревью PR и пустые коммиты.
//
// Кто зовёт:
//   - кнопка «Догрузить аналитику» во вкладке админки «Коммиты» (admin-cookie)
//     — по кругу, пока не кончится;
//   - /api/cron/sync-tokens каждые пять минут — на остаток своего времени;
//   - при желании внешний планировщик с Authorization: Bearer $CRON_SECRET.
// Без ИИ и без пересчёта балла (lib/backfill.ts). Ревью и клоны идут
// параллельно: одни упираются в лимит API, другие в сеть клонов.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/admin-session';
import { backfillEmptyCommits, backfillReviews } from '@/lib/backfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Запас до maxDuration: итог должен успеть записаться и вернуться. */
const BUDGET_MS = 250_000;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const bearer = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
  const admin = verifyAdminSession((await cookies()).get(ADMIN_COOKIE_NAME)?.value);
  if (!bearer && !admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const deadline = Date.now() + BUDGET_MS;
  const [reviews, emptyCommits] = await Promise.all([
    backfillReviews(db, { deadline }),
    backfillEmptyCommits(db, { deadline }),
  ]);
  return NextResponse.json({ reviews, emptyCommits });
}

/** Многие планировщики умеют только GET. */
export const GET = POST;
