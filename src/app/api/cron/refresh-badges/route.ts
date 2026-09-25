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
import { claimJobForAnalysis, processAnalysis, type ProcessOutcome } from '@/lib/analysis/run';
import { enqueueDailyRefresh, listQueuedOwnerAnalyses } from '@/lib/ownership';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Новый прогон начинаем, только если до конца функции осталось больше этого. */
const MIN_LEFT_MS = 90_000;
const BUDGET_MS = 290_000;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const deadline = Date.now() + BUDGET_MS;
  const { day, queued } = await enqueueDailyRefresh(db);

  const runner = `cron:${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}`;
  const totals: Record<ProcessOutcome, number> = { done: 0, failed: 0, requeued: 0 };
  let left = 0;
  for (const id of await listQueuedOwnerAnalyses(db)) {
    if (deadline - Date.now() < MIN_LEFT_MS) {
      left += 1;
      continue;
    }
    const job = await claimJobForAnalysis(db, id, runner);
    if (!job) continue;
    totals[await processAnalysis(db, job, runner)] += 1;
  }

  return NextResponse.json({ day, queued, ...totals, left });
}

/** Многие планировщики умеют только GET. */
export const GET = POST;
