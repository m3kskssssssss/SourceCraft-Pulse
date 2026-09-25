// POST|GET /api/cron/sync-tokens — автосинхронизация «Моих репозиториев».
//
// Дёргается внешним планировщиком раз в пять минут с заголовком
// Authorization: Bearer $CRON_SECRET. В docker то же делает воркер.
//
// Проходит по сохранённым токенам, которые пора синхронизировать, подтягивает
// новые репозитории (без оценки — её запускает пользователь) и досчитывает
// ждущие прогоны своих репозиториев, например брошенные закрытой вкладкой,
// пока хватает времени функции.

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { syncDueTokens } from '@/lib/token-sync';
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
  const sync = await syncDueTokens(db);
  const runs = await processQueuedOwnerAnalyses(
    deadline,
    `cron:${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}`,
  );
  return NextResponse.json({ ...sync, runs });
}

/** Многие планировщики умеют только GET. */
export const GET = POST;
