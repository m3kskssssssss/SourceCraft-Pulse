// GET /api/analyses/<id>/status — короткий ответ для опроса со страницы /a/<id>.
//
// Отдаём только статус: пока анализ считается, страница держит опрос, а как
// только статус стал done или failed — перерисовывает себя целиком.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses } from '@/db/schema';
import { auth } from '@/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'bad_id' }, { status: 400 });
  }

  const analysis = await db.query.analyses.findFirst({ where: eq(analyses.id, id) });
  if (!analysis) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Приватный анализ виден только владельцу — как и сама страница.
  if (!analysis.isPublic) {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId || userId !== analysis.requestedBy) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  }

  return NextResponse.json({
    status: analysis.status,
    score: analysis.score,
    error: analysis.error,
  });
}
