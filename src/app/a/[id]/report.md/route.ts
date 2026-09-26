// GET /a/{id}/report.md — отчёт об анализе одним Markdown-файлом.
// Права те же, что у страницы анализа: опубликованный — всем, остальное —
// только тому, кто запускал оценку.

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, repositories } from '@/db/schema';
import { auth } from '@/auth';
import { buildReportMarkdown } from '@/lib/report-markdown';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound();

  const analysis = await db.query.analyses.findFirst({ where: eq(analyses.id, id) });
  if (!analysis || analysis.status !== 'done') return notFound();

  if (!analysis.isPublic) {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId || analysis.requestedBy !== userId) return notFound();
  }

  const repo = await db.query.repositories.findFirst({
    where: eq(repositories.id, analysis.repositoryId),
  });
  if (!repo) return notFound();

  const origin = new URL(request.url).origin;
  const markdown = buildReportMarkdown({
    org: repo.orgSlug,
    repo: repo.repoSlug,
    webUrl: repo.webUrl ?? null,
    language: repo.language ?? null,
    score: analysis.score ?? null,
    kind: analysis.kind ?? 'project',
    finishedAt: analysis.finishedAt ?? null,
    categoryScores: analysis.categoryScores,
    recommendations: analysis.recommendations,
    missing: analysis.missing,
    penalties: (analysis.metrics as { penalties?: unknown } | null)?.penalties ?? [],
    pageUrl: `${origin}/a/${analysis.id}`,
    methodologyUrl: `${origin}/methodology`,
  });

  const filename = `pulse-${repo.orgSlug}-${repo.repoSlug}.md`.replace(/[^\w.-]+/g, '_');
  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      // Приватный отчёт не должен оседать в общих кэшах.
      'Cache-Control': analysis.isPublic ? 'public, max-age=60' : 'private, no-store',
    },
  });
}

function notFound(): Response {
  return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
