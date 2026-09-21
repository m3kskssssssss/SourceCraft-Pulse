// GET /api/badge/{org}/{repo}.svg — публичный SVG-бейдж.
// Кэшируем на минуту, но с stale-while-revalidate 5 минут:
// README на GitHub кэширует картинки, чтобы страничка не тормозила.

import { NextResponse } from 'next/server';
import { describeBadgeLookup, getLatestPublicAnalysis, hasUnpublishedAnalysis } from '@/lib/ranking';
import { renderBadgeSvg } from '@/lib/badge';
import { InvalidSlugError, parseSlug, stripSvgSuffix } from '@/lib/slug';
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
  // Next отдаёт сегмент вместе с расширением: «bem-method.svg». Снимаем его,
  // иначе слаг не совпадёт ни с одной строкой в базе.
  const repoClean = stripSvgSuffix(rawRepo);

  let org: string;
  let repo: string;
  try {
    ({ org, repo } = parseSlug(`${rawOrg}/${repoClean}`));
  } catch (err) {
    if (err instanceof InvalidSlugError) {
      return svgResponse(renderBadgeSvg({ score: null, note: 'неверный адрес' }), 400);
    }
    throw err;
  }

  // `?debug=1` отвечает JSON-ом: что нашлось по этому адресу в базе. Бейдж
  // без оценки ни о чём не говорит, а тут видно, чего именно не хватает.
  if (new URL(request.url).searchParams.get('debug') === '1') {
    let lookup: unknown;
    try {
      lookup = await describeBadgeLookup(org, repo);
    } catch (err) {
      lookup = { error: err instanceof Error ? err.message : String(err) };
    }
    return NextResponse.json(
      { params: { rawOrg, rawRepo }, resolved: { org, repo }, lookup },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const latest = await getLatestPublicAnalysis(org, repo);
  if (latest && latest.score !== null) {
    return svgResponse(renderBadgeSvg({ score: latest.score }), 200);
  }

  // Оценки нет — объясняем, почему именно. Прочерк без пояснения читается
  // как сломанный бейдж, и первым делом грешат на нас.
  const note = (await hasUnpublishedAnalysis(org, repo)) ? 'не опубликован' : 'нет оценки';
  // Отдаём 200: при 404 GitHub показывает битую картинку вместо подписи.
  // И кэшируем короче — бейдж должен ожить сразу после публикации.
  return svgResponse(renderBadgeSvg({ score: null, note }), 200, 30);
}

function svgResponse(svg: string, status: number, maxAge = 60): Response {
  return new Response(svg, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=300`,
    },
  });
}
