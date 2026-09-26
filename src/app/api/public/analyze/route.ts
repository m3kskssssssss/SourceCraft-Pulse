// POST /api/public/analyze — оценить публичный репозиторий без браузера.
//
//   curl -X POST https://<сайт>/api/public/analyze \
//     -H 'content-type: application/json' -d '{"repo":"ilugly/unit-converter"}'
//
// Оценка считается прямо в запросе: отдельного воркера на Vercel нет, поэтому
// curl ждёт, обычно полминуты–минуту, и получает готовый отчёт. Каждая оценка
// — клон и вызовы модели, поэтому:
//   - свежий отчёт (моложе FRESH_MS) отдаём сразу, без нового прогона;
//   - если репозиторий уже считается — 202 и адрес для опроса статуса;
//   - новых прогонов с одного адреса — не больше RUNS_PER_HOUR в час.
// Оценка публичного репозитория по публичным данным сразу публикуется.

import { NextResponse } from 'next/server';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, analysisJobs, events, repositories } from '@/db/schema';
import { claimJobForAnalysis, processAnalysis } from '@/lib/analysis/run';
import { ensureRepository } from '@/lib/ownership';
import { buildPublicReport, findLatestPublicAnalysis } from '@/lib/public-report';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { InvalidSlugError, parseSlug } from '@/lib/slug';
import { getSourcecraftClient } from '@/lib/sourcecraft/client';
import { SourcecraftApiError, SourcecraftNotFoundError } from '@/lib/sourcecraft/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Отчёт моложе этого отдаём без нового прогона. */
const FRESH_MS = 12 * 3600 * 1000;
/** Прогон, начатый раньше, считаем брошенным и не ждём его. */
const RUNNING_MS = 10 * 60 * 1000;
const RUNS_PER_HOUR = 5;
const REQUESTS_PER_MINUTE = 20;

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  const rl = rateLimit(`analyze-api:${ip}`, REQUESTS_PER_MINUTE, 60_000);
  if (!rl.allowed) return tooMany(rl.resetInMs);

  const target = await readTarget(request);
  let org: string;
  let repo: string;
  try {
    ({ org, repo } = parseSlug(target ?? ''));
  } catch (err) {
    return NextResponse.json(
      {
        error: 'invalid_repo',
        reason: err instanceof InvalidSlugError ? err.reason : 'Ожидалось поле repo вида org/repo',
        example: { repo: 'ilugly/unit-converter' },
      },
      { status: 400 },
    );
  }
  const origin = new URL(request.url).origin;
  const force = new URL(request.url).searchParams.get('force') === '1';

  // Свежий отчёт — сразу.
  const latest = await findLatestPublicAnalysis(org, repo);
  if (
    !force &&
    latest?.analysis.finishedAt &&
    Date.now() - latest.analysis.finishedAt.getTime() < FRESH_MS
  ) {
    return NextResponse.json({
      cached: true,
      report: buildPublicReport(latest.analysis, latest.repository, origin),
    });
  }

  // Существует ли и публичный ли — как при оценке с сайта.
  try {
    const repository = await getSourcecraftClient().getRepository(org, repo);
    if (repository.visibility && repository.visibility !== 'public') {
      return NextResponse.json(
        { error: 'not_public', reason: 'Через публичный API оцениваются только публичные репозитории.' },
        { status: 403 },
      );
    }
  } catch (err) {
    if (err instanceof SourcecraftNotFoundError) {
      return NextResponse.json({ error: 'not_found', reason: `Репозиторий ${org}/${repo} не найден.` }, { status: 404 });
    }
    const status = err instanceof SourcecraftApiError ? err.status : 0;
    return NextResponse.json({ error: 'sourcecraft_unavailable', status }, { status: 502 });
  }

  const repositoryId = await ensureRepository(db, org, repo);
  if (!repositoryId) return NextResponse.json({ error: 'internal' }, { status: 500 });

  // Уже считается — не запускаем второй прогон.
  const [running] = await db
    .select({ id: analyses.id, status: analyses.status })
    .from(analyses)
    .where(
      and(
        eq(analyses.repositoryId, repositoryId),
        inArray(analyses.status, ['queued', 'running']),
        gte(analyses.createdAt, new Date(Date.now() - RUNNING_MS)),
      ),
    )
    .orderBy(desc(analyses.createdAt))
    .limit(1);
  if (running) return inProgress(running.id, running.status, origin);

  const runs = rateLimit(`analyze-api-runs:${ip}`, RUNS_PER_HOUR, 3_600_000);
  if (!runs.allowed) return tooMany(runs.resetInMs);

  const [analysis] = await db
    .insert(analyses)
    .values({ repositoryId, status: 'queued', isPublic: true })
    .returning({ id: analyses.id });
  if (!analysis) return NextResponse.json({ error: 'internal' }, { status: 500 });
  await db.insert(analysisJobs).values({ analysisId: analysis.id });
  await db.insert(events).values({
    kind: 'analysis.queued',
    payload: { analysisId: analysis.id, org, repo, via: 'api' },
  });

  const runner = `api:${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}`;
  const job = await claimJobForAnalysis(db, analysis.id, runner);
  if (!job) return inProgress(analysis.id, 'queued', origin);
  await processAnalysis(db, job, runner);

  const fresh = await db.query.analyses.findFirst({ where: eq(analyses.id, analysis.id) });
  const repository = await db.query.repositories.findFirst({ where: eq(repositories.id, repositoryId) });
  if (!fresh || !repository) return NextResponse.json({ error: 'internal' }, { status: 500 });
  if (fresh.status !== 'done') {
    return NextResponse.json(
      { error: 'analysis_failed', id: fresh.id, status: fresh.status, reason: fresh.error },
      { status: 502 },
    );
  }
  return NextResponse.json({ cached: false, report: buildPublicReport(fresh, repository, origin) });
}

/** Поле repo: из JSON, из формы или из ?repo=. */
async function readTarget(request: Request): Promise<string | null> {
  const fromQuery = new URL(request.url).searchParams.get('repo');
  if (fromQuery) return fromQuery;
  const type = request.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/json')) {
      const body = (await request.json()) as { repo?: unknown };
      return typeof body.repo === 'string' ? body.repo : null;
    }
    if (type.includes('form')) {
      const value = (await request.formData()).get('repo');
      return typeof value === 'string' ? value : null;
    }
  } catch {
    return null;
  }
  return null;
}

function inProgress(id: string, status: string, origin: string): Response {
  return NextResponse.json(
    {
      id,
      status,
      statusUrl: `${origin}/api/analyses/${id}/status`,
      page: `${origin}/a/${id}`,
      hint: 'Оценка уже идёт. Опросите statusUrl; когда status станет done, отчёт отдаст /api/public/repos/{org}/{repo}/report.',
    },
    { status: 202 },
  );
}

function tooMany(resetInMs: number): Response {
  return NextResponse.json(
    { error: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(resetInMs / 1000)) } },
  );
}
