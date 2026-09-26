// /api/improvements/<analysisId> — подготовка предложения pull request.
//
// POST готовит правки прямо в запросе: клон, две задачи ИИ, проверка — до
// пары минут, поэтому отдельный маршрут с maxDuration 300, а не действие
// страницы. Повторный POST, пока идёт подготовка, новую не запускает.
// GET — короткий ответ для опроса: статус и фаза.
//
// Звать может только подтверждённый владелец (getImprovementContext).

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { events, improvementProposals } from '@/db/schema';
import { getImprovementContext, getLatestProposal, isPreparing } from '@/lib/improvements/for-analysis';
import { prepareProposal } from '@/lib/improvements/prepare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Запас до maxDuration: результат должен успеть записаться. */
const DEADLINE_MS = 270_000;

type RouteContext = { params: Promise<{ analysisId: string }> };

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const started = Date.now();
  const { analysisId } = await context.params;
  const userId = await currentUserId();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(analysisId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const ctx = await getImprovementContext(analysisId, userId);
  if (!ctx) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (ctx.blocker) return NextResponse.json({ error: ctx.blocker }, { status: 409 });

  const latest = await getLatestProposal(analysisId, userId);
  if (isPreparing(latest)) return NextResponse.json({ status: 'preparing', alreadyRunning: true });

  const [row] = await db
    .insert(improvementProposals)
    .values({ analysisId, userId, repositoryId: ctx.repositoryId, status: 'preparing', stage: 'clone' })
    .returning({ id: improvementProposals.id });
  if (!row) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });

  await prepareProposal(ctx, row.id, started + DEADLINE_MS);

  const fresh = await getLatestProposal(analysisId, userId);
  await db.insert(events).values({
    userId,
    kind: 'improvement.prepared',
    payload: { analysisId, proposalId: row.id, status: fresh?.status ?? null, ms: Date.now() - started },
  });
  return NextResponse.json({ status: fresh?.status ?? 'unknown' });
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { analysisId } = await context.params;
  const userId = await currentUserId();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(analysisId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const latest = await getLatestProposal(analysisId, userId);
  if (!latest) return NextResponse.json({ status: 'none' });
  return NextResponse.json({
    status: isPreparing(latest) ? 'preparing' : latest.status === 'preparing' ? 'failed' : latest.status,
    stage: latest.stage,
    startedAt: latest.createdAt.toISOString(),
  });
}

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}
