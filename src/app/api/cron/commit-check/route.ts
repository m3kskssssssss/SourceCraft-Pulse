// POST|GET /api/cron/commit-check — проверка новых коммитов у оценённых репозиториев.
//
// Плановая проверка — в 00:00 и 12:00 по Москве: внешний планировщик
// вызывает маршрут с Authorization: Bearer $CRON_SECRET (можно и раз в час —
// повторный вызов в том же окне только добирает несверенное и досчитывает
// переоценки). Кнопка «Проверить сейчас» во вкладке админки «Коммиты» зовёт
// его с admin-cookie и `?force=1`: окно начинается с момента нажатия.
//
// Сначала сверка (lib/commit-check.ts): без новых коммитов оценка остаётся,
// в истории отметка «без изменений»; с новыми — заводится переоценка. Потом
// на остаток времени переоценки запускаются отдельными функциями
// POST /api/analyses/<id>/run, по три одновременно.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/admin-session';
import { driveReanalyses, runCommitCheck } from '@/lib/commit-check';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Сверка укладывается сюда; остальное время — на переоценки. */
const CHECK_WINDOW_MS = 150_000;
/** После этого новые переоценки не берём: ждём начатые до конца функции. */
const CLAIM_WINDOW_MS = 200_000;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const bearer = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
  const admin = verifyAdminSession((await cookies()).get(ADMIN_COOKIE_NAME)?.value);
  if (!bearer && !admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const started = Date.now();
  const check = await runCommitCheck(db, {
    deadline: started + CHECK_WINDOW_MS,
    trigger: admin && !bearer ? 'admin' : 'schedule',
    force: url.searchParams.get('force') === '1',
  });

  // Запуск оценки пускается только по CRON_SECRET; без него переоценки ждут
  // воркера или открытой страницы анализа.
  const launched = secret
    ? await driveReanalyses(db, { origin: url.origin, secret, claimUntil: started + CLAIM_WINDOW_MS })
    : 0;

  return NextResponse.json({ ...check, launched });
}

/** Многие планировщики умеют только GET. */
export const GET = POST;
