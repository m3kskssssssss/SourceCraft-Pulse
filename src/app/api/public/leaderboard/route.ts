// Публичный API рейтинга. Возвращает только опубликованные анализы.
// GET /api/public/leaderboard?sort=score|forks&q=...&lang=Python,Go&limit=20&offset=0
//
// lang принимает несколько языков через запятую — как и фильтр на главной.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLeaderboard, type LeaderboardSort } from '@/lib/ranking';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const querySchema = z.object({
  sort: z.enum(['score', 'forks']).optional(),
  q: z.string().max(120).optional(),
  lang: z.string().max(400).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
});

export async function GET(request: Request): Promise<Response> {
  const rl = rateLimit(`leaderboard:${clientIp(request)}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    sort: url.searchParams.get('sort') ?? undefined,
    q: url.searchParams.get('q') ?? undefined,
    lang: url.searchParams.get('lang') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query', details: parsed.error.issues }, { status: 400 });
  }

  const { items, total } = await getLeaderboard({
    sort: parsed.data.sort as LeaderboardSort | undefined,
    query: parsed.data.q,
    languages: parseLanguages(parsed.data.lang),
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });

  return NextResponse.json(
    { items, total, limit: parsed.data.limit ?? 20, offset: parsed.data.offset ?? 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}

/** «Python, Go» → ['Python', 'Go']. Пустота и лишние запятые отбрасываются. */
function parseLanguages(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const list = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 20);
  return list.length > 0 ? list : undefined;
}
