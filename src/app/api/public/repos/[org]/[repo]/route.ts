// GET /api/public/repos/{org}/{repo} — последний опубликованный анализ.
// Возвращает 404 если публичной записи нет.

import { NextResponse } from 'next/server';
import { getLatestPublicAnalysis } from '@/lib/ranking';
import { InvalidSlugError, parseSlug } from '@/lib/slug';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

type Params = { params: Promise<{ org: string; repo: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  const rl = rateLimit(`repo:${clientIp(request)}`, 60, 60_000);
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

  const item = await getLatestPublicAnalysis(org, repo);
  if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json(item, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
