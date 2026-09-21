// POST /api/analyses/<id>/run — считает анализ прямо в запросе.
//
// Основной путь на Vercel: отдельного воркера нет, функции с Fluid compute
// живут до 300 с, а весь анализ (сбор фактов + три AI-задачи) укладывается
// в десятки секунд. Страница /a/<id> дёргает этот маршрут и опрашивает статус.
//
// Кто может звать:
//   - владелец анализа (сессия Auth.js);
//   - внешний планировщик с заголовком Authorization: Bearer $CRON_SECRET —
//     им добираются задачи, брошенные упавшей функцией.
//
// Повторные вызовы безопасны: задачу забирает claimJobForAnalysis, второй
// вызывающий получает ответ already_running.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses } from '@/db/schema';
import { auth } from '@/auth';
import { claimJobForAnalysis, processAnalysis } from '@/lib/analysis/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Предел Hobby с Fluid compute; анализу обычно хватает 20–40 с. */
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'bad_id' }, { status: 400 });
  }

  const analysis = await db.query.analyses.findFirst({ where: eq(analyses.id, id) });
  if (!analysis) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (!(await isAllowed(request, analysis.requestedBy))) {
    // Существование анализа не подтверждаем.
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (analysis.status === 'done' || analysis.status === 'failed') {
    return NextResponse.json({ status: analysis.status, alreadyFinished: true });
  }

  const job = await claimJobForAnalysis(db, id, runnerId());
  if (!job) {
    return NextResponse.json({ status: analysis.status, alreadyRunning: true });
  }

  const outcome = await processAnalysis(db, job, runnerId());
  const fresh = await db.query.analyses.findFirst({ where: eq(analyses.id, id) });

  return NextResponse.json({
    status: fresh?.status ?? 'unknown',
    outcome,
    score: fresh?.score ?? null,
  });
}

async function isAllowed(request: Request, requestedBy: string | null): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) return true;

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  return Boolean(userId && userId === requestedBy);
}

/** Чем подписываем лок: у serverless нет hostname, берём id деплоя. */
function runnerId(): string {
  return `vercel:${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}`;
}
