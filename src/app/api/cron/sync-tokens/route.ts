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
import { backfillEmptyCommits, backfillReviews } from '@/lib/backfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUDGET_MS = 290_000;
/** Меньше этого остатка догрузку аналитики не начинаем. */
const BACKFILL_MIN_MS = 90_000;
/** Запас на ответ после догрузки. */
const BACKFILL_RESERVE_MS = 20_000;

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
  // Остаток времени — на догрузку ревью и пустых коммитов в старые анализы
  // (lib/backfill.ts): без ИИ, порциями, пока есть что догружать.
  let backfill: unknown = null;
  if (deadline - Date.now() > BACKFILL_MIN_MS) {
    const until = deadline - BACKFILL_RESERVE_MS;
    const [reviews, emptyCommits] = await Promise.all([
      backfillReviews(db, { deadline: until }),
      backfillEmptyCommits(db, { deadline: until }),
    ]).catch(() => [null, null]);
    backfill = { reviews, emptyCommits };
  }
  return NextResponse.json({ ...sync, runs, backfill });
}

/** Многие планировщики умеют только GET. */
export const GET = POST;
