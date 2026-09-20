// GET /api/badge/{org}/{repo}.svg — публичный SVG-бейдж.
// Кэшируем на минуту, но с stale-while-revalidate 5 минут:
// README на GitHub кэширует картинки, чтобы страничка не тормозила.

import { NextResponse } from 'next/server';
import { getLatestPublicAnalysis } from '@/lib/ranking';
import { renderBadgeSvg } from '@/lib/badge';
import { InvalidSlugError, parseSlug } from '@/lib/slug';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ org: string; repo: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  const rl = rateLimit(`badge:${clientIp(request)}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } },
    );
  }

  const { org: rawOrg, repo: rawRepo } = await params;
  // Suffix `.svg` уже отрезан роутингом (dir name `[repo].svg`).
  // Но входящий repo может нести суффикс, если запросили что-то нестандартное.
  const repoClean = rawRepo.endsWith('.svg') ? rawRepo.slice(0, -4) : rawRepo;

  let org: string;
  let repo: string;
  try {
    ({ org, repo } = parseSlug(`${rawOrg}/${repoClean}`));
  } catch (err) {
    if (err instanceof InvalidSlugError) {
      return svgResponse(renderBadgeSvg({ score: null }), 400);
    }
    throw err;
  }

  const latest = await getLatestPublicAnalysis(org, repo);
  const svg = renderBadgeSvg({ score: latest?.score ?? null });
  return svgResponse(svg, latest ? 200 : 404);
}

function svgResponse(svg: string, status: number): Response {
  return new Response(svg, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
