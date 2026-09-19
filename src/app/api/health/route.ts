// Health-эндпоинт. Проверяет, что приложение может выполнить простейший запрос к БД.
// Возвращает 200 { status: 'ok', db: 'ok' } либо 503 с честным описанием проблемы
// (без внутренних деталей соединения, чтобы не светить структуру окружения).

import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

// Health не кэшируем — иначе покажет старое состояние БД.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<Response> {
  try {
    const result = await db.execute(sql`select 1 as ok`);
    const rows = result as unknown as Array<{ ok: number }>;
    const first = rows[0];
    if (!first || first.ok !== 1) {
      return NextResponse.json(
        { status: 'error', db: 'unexpected_result' },
        { status: 503 },
      );
    }
    return NextResponse.json({ status: 'ok', db: 'ok' });
  } catch {
    // Не отдаём наружу текст исключения — он может содержать хост Neon и пр.
    return NextResponse.json({ status: 'error', db: 'unreachable' }, { status: 503 });
  }
}
