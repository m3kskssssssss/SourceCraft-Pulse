// GET /api/admin/reports-export?format=md|pdf&part=N — все опубликованные отчёты
// одним ZIP-архивом (п. 12.1 ТЗ: выгружаемый отчёт по каждому
// проанализированному репозиторию). Только для админа.
//
// Markdown собирается быстро — всё в одном архиве. PDF рендерится дольше,
// поэтому отдаётся частями по PDF_PART штук, чтобы уложиться в maxDuration.

import { asc, desc, eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { analyses, repositories } from '@/db/schema';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/admin-session';
import { readExtraAnalytics } from '@/lib/extra-analytics';
import { renderReportPdf } from '@/lib/poster/render';
import { buildPublicReport } from '@/lib/public-report';
import { buildReportMarkdown } from '@/lib/report-markdown';
import { PDF_PART, PUBLISHED_REPORTS as PUBLISHED } from '@/lib/reports-export';
import { buildZip, type ZipEntry } from '@/lib/zip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  if (!verifyAdminSession((await cookies()).get(ADMIN_COOKIE_NAME)?.value)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format') === 'pdf' ? 'pdf' : 'md';
  const part = Math.max(1, Number(url.searchParams.get('part')) || 1);

  const base = db
    .select({ analysis: analyses, repo: repositories })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(PUBLISHED)
    .orderBy(sql`${analyses.score} desc nulls last`, desc(analyses.finishedAt), asc(repositories.orgSlug));
  const rows = format === 'pdf' ? await base.limit(PDF_PART).offset((part - 1) * PDF_PART) : await base;

  const entries: ZipEntry[] = [];
  const index: string[] = [
    '# Отчёты Pulse',
    '',
    `Выгрузка ${new Date().toISOString().slice(0, 10)}: опубликованные оценки открытых репозиториев SourceCraft.`,
    '',
    '| # | Репозиторий | Балл | Веб-отчёт | Файл |',
    '|---:|---|---:|---|---|',
  ];

  let place = format === 'pdf' ? (part - 1) * PDF_PART : 0;
  for (const { analysis, repo } of rows) {
    place += 1;
    const file = `${repo.orgSlug}__${repo.repoSlug}.${format}`.replace(/[^\w.-]+/g, '_');
    const pageUrl = `${url.origin}/a/${analysis.id}`;

    if (format === 'md') {
      entries.push({
        name: file,
        data: buildReportMarkdown({
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
          pageUrl,
          methodologyUrl: `${url.origin}/methodology`,
          // Без сетевых догрузок: только то, что уже сохранено в анализе.
          extras: readExtraAnalytics(analysis.metrics),
        }),
      });
    } else {
      try {
        const report = buildPublicReport(analysis, repo, url.origin);
        entries.push({ name: file, data: await renderReportPdf({ report, host: url.host }) });
      } catch {
        continue; // один сбойный отчёт не должен ронять всю часть
      }
    }
    const score = typeof analysis.score === 'number' ? String(analysis.score) : '—';
    index.push(`| ${place} | ${repo.orgSlug}/${repo.repoSlug} | ${score} | ${pageUrl} | ${file} |`);
  }
  entries.unshift({ name: 'README.md', data: index.join('\n') + '\n' });

  const zip = buildZip(entries);
  const name = format === 'pdf' ? `pulse-reports-pdf-part${part}.zip` : 'pulse-reports-md.zip';
  return new Response(zip as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
