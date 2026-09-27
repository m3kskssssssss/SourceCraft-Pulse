// POST|GET /api/cron/catalog-run — диспетчер прогона каталога.
//
// Пока в админке нажат «Старт», держит до трёх оценок каталога одновременно:
// каждый слот берёт следующий репозиторий (lib/catalog.ts, dispatchCatalogJob)
// и запускает его отдельной функцией POST /api/analyses/<id>/run, дожидается
// и берёт следующий. Новые берёт первые ~200 с, дальше досчитывает начатые.
//
// Кто дёргает:
//   - открытая вкладка админки «Каталог» (admin-cookie) — сразу после «Старта»
//     и дальше по кругу;
//   - внешний планировщик раз в минуту с Authorization: Bearer $CRON_SECRET —
//     чтобы прогон шёл и с закрытой админкой.
// Одновременные вызовы безопасны: слоты считаются по базе под advisory-локом.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/admin-session';
import { CATALOG_CONCURRENCY, dispatchCatalogJob } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** После этого новые репозитории не берём: ждём начатые до конца функции. */
const CLAIM_WINDOW_MS = 200_000;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const bearer = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
  const admin = verifyAdminSession((await cookies()).get(ADMIN_COOKIE_NAME)?.value);
  if (!bearer && !admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // Сам запуск оценки пускает только по CRON_SECRET.
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const started = Date.now();
  let launched = 0;

  await Promise.all(
    Array.from({ length: CATALOG_CONCURRENCY }, async () => {
      while (Date.now() - started < CLAIM_WINDOW_MS) {
        const analysisId = await dispatchCatalogJob(db);
        if (!analysisId) return;
        launched += 1;
        // Ответ приходит, когда оценка досчитана. Если эта функция умрёт
        // раньше, оценка всё равно доживёт в своей.
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
