// POST|GET /api/cron/catalog — обход каталога публичных репозиториев SourceCraft.
//
// Дёргается внешним планировщиком раз в сутки с заголовком
// Authorization: Bearer $CRON_SECRET. В docker-развёртывании то же самое
// делает воркер (CATALOG_SYNC_HOURS), и этот маршрут не нужен.
//
// Только карточки из GET /repos: без клонов и ИИ, около 275 страниц.

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { syncCatalog } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUDGET_MS = 280_000;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const result = await syncCatalog(db, { deadline: Date.now() + BUDGET_MS });
  return NextResponse.json(result);
}

/** Многие планировщики умеют только GET. */
export const GET = POST;
