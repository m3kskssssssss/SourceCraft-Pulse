// POST|GET /api/cron/refresh-badges — суточный пересчёт своих репозиториев.
//
// Дёргается внешним планировщиком в 00:00 с заголовком
// Authorization: Bearer $CRON_SECRET (на Vercel Hobby свой cron неточен).
// В docker-развёртывании то же самое делает воркер, и этот маршрут не нужен.
//
// Что делает:
//   1) ставит в очередь по прогону на каждый подтверждённый репозиторий,
//      который сегодня ещё не пересчитывали (повторный вызов в те же сутки
//      ничего нового не поставит);
//   2) считает ждущие прогоны своих репозиториев по одному, пока хватает
//      времени функции. Не успел — следующий вызов продолжит с того же места.

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { enqueueDailyRefresh } from '@/lib/ownership';
import { processQueuedOwnerAnalyses } from '@/lib/owner-runs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUDGET_MS = 290_000;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const deadline = Date.now() + BUDGET_MS;
  const { day, queued } = await enqueueDailyRefresh(db);
  const runs = await processQueuedOwnerAnalyses(
    deadline,
    `cron:${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}`,
  );
  return NextResponse.json({ day, queued, ...runs });
}

/** Многие планировщики умеют только GET. */
export const GET = POST;
