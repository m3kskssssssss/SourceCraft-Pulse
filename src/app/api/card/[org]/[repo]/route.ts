// GET /api/card/{org}/{repo}.svg — бейдж-карточка: балл, категории, язык,
// дата пересчёта. Для подтверждённых репозиториев она обновляется каждый день
// в 00:00 (см. lib/ownership.ts), для остальных показывает последний
// опубликованный прогон, как и маленький бейдж.

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { getLatestPublicAnalysis, hasUnpublishedAnalysis } from '@/lib/ranking';
import { renderBadgeCardSvg } from '@/lib/badge-card';
import { EMPTY_CATEGORY_VALUES } from '@/lib/category-meta';
import { isRepositoryVerified, refreshTimeZone } from '@/lib/ownership';
import { InvalidSlugError, parseSlug, stripSvgSuffix } from '@/lib/slug';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ org: string; repo: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  const rl = rateLimit(`card:${clientIp(request)}`, 120, 60_000);
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
    ({ org, repo } = parseSlug(`${rawOrg}/${stripSvgSuffix(rawRepo)}`));
  } catch (err) {
    if (err instanceof InvalidSlugError) {
      return svgResponse(
        renderBadgeCardSvg({
          org: rawOrg,
          repo: rawRepo,
          score: null,
          note: 'неверный адрес',
          categories: EMPTY_CATEGORY_VALUES,
          language: null,
          updated: null,
          verified: false,
        }),
        400,
      );
    }
    throw err;
  }

  const [latest, verified] = await Promise.all([
    getLatestPublicAnalysis(org, repo),
    isRepositoryVerified(db, org, repo),
  ]);

  if (latest && latest.kind !== 'material' && latest.score !== null) {
    return svgResponse(
      renderBadgeCardSvg({
        org: latest.org,
        repo: latest.repo,
        score: latest.score,
        categories: latest.categories,
        language: latest.language,
        updated: latest.publishedAt ? formatDay(new Date(latest.publishedAt)) : null,
        verified,
      }),
      200,
    );
  }

  const note =
    latest?.kind === 'material'
      ? 'полезный материал'
      : (await hasUnpublishedAnalysis(org, repo))
        ? 'не опубликован'
        : 'нет оценки';
  // 200, а не 404: иначе в README вместо подписи будет битая картинка.
  return svgResponse(
    renderBadgeCardSvg({
      org: latest?.org ?? org,
      repo: latest?.repo ?? repo,
      score: null,
      note,
      categories: latest?.categories ?? EMPTY_CATEGORY_VALUES,
      language: latest?.language ?? null,
      updated: latest?.publishedAt ? formatDay(new Date(latest.publishedAt)) : null,
      verified,
    }),
    200,
    30,
  );
}

/** ДД.ММ.ГГГГ в часовом поясе суточного пересчёта. */
function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: refreshTimeZone(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Кэш короткий: пересчёт идёт раз в сутки, но заканчивается в разное время,
 * и карточка должна подхватить свежий балл вскоре после него.
 */
function svgResponse(svg: string, status: number, maxAge = 300): Response {
  return new Response(svg, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=600`,
    },
  });
}
