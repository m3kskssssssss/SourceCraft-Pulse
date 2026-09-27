// GET /a/{id}/export/{card|report}.{png|pdf} — оценка картинкой или PDF.
// Права те же, что у страницы анализа: опубликованный — всем, остальное —
// только тому, кто запускал оценку.

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, repositories } from '@/db/schema';
import { auth } from '@/auth';
import { buildPublicReport } from '@/lib/public-report';
import {
  renderCardPdf,
  renderCardPng,
  renderReportPdf,
  renderReportPng,
  type ExportContext,
} from '@/lib/poster/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ id: string; file: string }> };

const RENDERERS = {
  'card.png': renderCardPng,
  'card.pdf': renderCardPdf,
  'report.png': renderReportPng,
  'report.pdf': renderReportPdf,
} satisfies Record<string, (ctx: ExportContext) => Promise<Uint8Array>>;

export async function GET(request: Request, { params }: Params): Promise<Response> {
  const { id, file } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(file in RENDERERS)) return notFound();

  const analysis = await db.query.analyses.findFirst({ where: eq(analyses.id, id) });
  if (!analysis || analysis.status !== 'done') return notFound();

  if (!analysis.isPublic) {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId || analysis.requestedBy !== userId) return notFound();
  }

  const repo = await db.query.repositories.findFirst({ where: eq(repositories.id, analysis.repositoryId) });
  if (!repo) return notFound();

  const url = new URL(request.url);
  const report = buildPublicReport(analysis, repo, url.origin);
  const bytes = await RENDERERS[file as keyof typeof RENDERERS]({ report, host: url.host });

  const [kind, ext] = file.split('.') as [string, 'png' | 'pdf'];
  const filename = `pulse-${repo.orgSlug}-${repo.repoSlug}-${kind}.${ext}`.replace(/[^\w.-]+/g, '_');
  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': ext === 'pdf' ? 'application/pdf' : 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Приватный отчёт не должен оседать в общих кэшах.
      'Cache-Control': analysis.isPublic ? 'public, max-age=300' : 'private, no-store',
    },
  });
}

function notFound(): Response {
  return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
