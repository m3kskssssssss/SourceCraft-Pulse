// POST|GET /api/cron/refresh-public — плановый пересчёт публичного рейтинга.
//
// Дёргается внешним планировщиком раз в час с заголовком
// Authorization: Bearer $CRON_SECRET. В docker-развёртывании то же самое
// делает воркер (PUBLIC_REFRESH_BATCH), и этот маршрут не нужен.
//
// Берёт опубликованные оценки, которые устарели: репозиторий изменился после
// анализа (last_updated из каталога) или оценке больше PUBLIC_REFRESH_DAYS
// дней (по умолчанию 7). Каждую пересчитывает отдельной функцией
// POST /api/analyses/<id>/run — до трёх одновременно, пока хватает времени.
// Новая оценка по завершении сменяет прежнюю в рейтинге; упала — прежняя
// остаётся, а повтор будет не раньше чем через сутки.

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { CATALOG_CONCURRENCY, dispatchRefreshJob } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** После этого новые пересчёты не берём: ждём начатые до конца функции. */
const CLAIM_WINDOW_MS = 200_000;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const started = Date.now();
  let launched = 0;

  await Promise.all(
    Array.from({ length: CATALOG_CONCURRENCY }, async () => {
      while (Date.now() - started < CLAIM_WINDOW_MS) {
        const analysisId = await dispatchRefreshJob(db);
        if (!analysisId) return;
        launched += 1;
        await fetch(`${origin}/api/analyses/${analysisId}/run`, {
          method: 'POST',
          headers: { authorization: `Bearer ${secret}` },
        }).catch(() => undefined);
      }
    }),
  );

  return NextResponse.json({ launched });
}

/** Многие планировщики умеют только GET. */
export const GET = POST;
