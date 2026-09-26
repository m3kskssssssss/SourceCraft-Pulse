// GET /api/public/repos/{org}/{repo}/report — полный отчёт последнего
// опубликованного анализа: категории, метрики, штрафы, рекомендации.
//   ?format=md — тот же отчёт Markdown-документом.
//
//   curl https://<сайт>/api/public/repos/ilugly/unit-converter/report
//   curl "https://<сайт>/api/public/repos/ilugly/unit-converter/report?format=md"

import { NextResponse } from 'next/server';
import { buildPublicReport, findLatestPublicAnalysis } from '@/lib/public-report';
import { buildReportMarkdown } from '@/lib/report-markdown';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { InvalidSlugError, parseSlug } from '@/lib/slug';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ org: string; repo: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  const rl = rateLimit(`report:${clientIp(request)}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } },
    );
  }

  const { org: rawOrg, repo: rawRepo } = await params;
  let org: string;
  let repo: string;
  try {
    ({ org, repo } = parseSlug(`${rawOrg}/${rawRepo}`));
  } catch (err) {
    if (err instanceof InvalidSlugError) {
      return NextResponse.json({ error: 'invalid_slug', reason: err.reason }, { status: 400 });
    }
    throw err;
  }

  const found = await findLatestPublicAnalysis(org, repo);
  if (!found) {
    return NextResponse.json(
      { error: 'not_found', hint: 'Опубликованной оценки нет. Запустите её: POST /api/public/analyze' },
      { status: 404 },
    );
  }

  const origin = new URL(request.url).origin;
  const headers = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };
  if (new URL(request.url).searchParams.get('format') === 'md') {
    const { analysis, repository } = found;
    const markdown = buildReportMarkdown({
      org: repository.orgSlug,
      repo: repository.repoSlug,
      webUrl: repository.webUrl ?? null,
      language: repository.language ?? null,
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
    return new Response(markdown, { headers: { ...headers, 'Content-Type': 'text/markdown; charset=utf-8' } });
  }

  return NextResponse.json(buildPublicReport(found.analysis, found.repository, origin), { headers });
}
