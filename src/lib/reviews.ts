// Аналитика review-комментариев pull request.
//
// Берём последние REVIEW_SAMPLE_PRS pull request и их комментарии
// (GET /repos/{org}/{repo}/pulls/{slug}/comments). Ревью — комментарий не
// автора PR; комментарии AppSec (type = appsec) считаем отдельно, это не люди.
// По ним видно, смотрят ли изменения вообще, сколько ждут первого ответа и
// где узкое место — открытые PR, которые давно ждут ревью.
//
// В балл не входит: это углублённая аналитика со звёздочкой, и место в
// рейтинге от неё не меняется. У новых анализов собирается вместе с фактами,
// у старых — при первом открытии отчёта (lib/reviews-store.ts).

import type { PullRequest, SourcecraftClient } from './sourcecraft/client';
import type { components } from './sourcecraft/types.gen';

type PullRequestComment = components['schemas']['PullRequestComment'];

/** Сколько последних PR разбираем: по запросу на каждый при лимите API 10 в секунду. */
export const REVIEW_SAMPLE_PRS = 20;
/** Открытый PR без ревью дольше этого — ждёт ревью, узкое место. */
export const REVIEW_WAITING_DAYS = 7;
const COMMENTS_PER_PR_LIMIT = 200;

export type ReviewStats =
  | {
      available: true;
      /** Сколько PR разобрали. */
      sampledPrs: number;
      /** PR, где хотя бы один комментарий оставил не автор. */
      reviewedPrs: number;
      /** Комментариев ревьюеров всего. */
      reviewComments: number;
      /** Медиана комментариев ревьюеров на PR с ревью. */
      medianCommentsPerReviewedPr: number | null;
      /** Медиана часов от создания PR до первого комментария ревьюера. */
      medianFirstReviewHours: number | null;
      /** Доля комментариев к уже изменённому коду (is_outdated), %. */
      outdatedSharePercent: number | null;
      /** Комментарии SourceCraft AppSec в PR — не ревью людьми. */
      appsecComments: number;
      /** Открытые PR без ревью дольше REVIEW_WAITING_DAYS дней. */
      waitingPrs: number;
      topReviewers: Array<{ slug: string; comments: number }>;
      collectedAt: string;
    }
  | { available: false; reason: string; collectedAt: string };

/** Чистая сводка по PR и их комментариям. */
export function summarizeReviews(
  prs: PullRequest[],
  commentsBySlug: Map<string, PullRequestComment[]>,
  now: Date = new Date(),
): ReviewStats {
  const collectedAt = now.toISOString();
  let reviewedPrs = 0;
  let reviewComments = 0;
  let outdated = 0;
  let appsecComments = 0;
  let waitingPrs = 0;
  const perReviewedPr: number[] = [];
  const firstReviewHours: number[] = [];
  const byReviewer = new Map<string, number>();

  for (const pr of prs) {
    const slug = pr.slug ?? '';
    const author = pr.author?.slug ?? pr.author?.id ?? null;
    const comments = (commentsBySlug.get(slug) ?? []).filter((c) => !c.is_deleted && c.is_published !== false);
    let own = 0;
    let first: number | null = null;
    for (const c of comments) {
      if (c.type === 'appsec') {
        appsecComments += 1;
        continue;
      }
      const who = c.author?.slug ?? c.author?.id ?? null;
      if (who !== null && who === author) continue;
      own += 1;
      if (c.is_outdated) outdated += 1;
      if (who) byReviewer.set(who, (byReviewer.get(who) ?? 0) + 1);
      const at = Date.parse(c.created_at ?? '');
      if (Number.isFinite(at) && (first === null || at < first)) first = at;
    }
    const created = Date.parse(pr.created_at ?? '');
    if (own > 0) {
      reviewedPrs += 1;
      reviewComments += own;
      perReviewedPr.push(own);
      if (first !== null && Number.isFinite(created)) firstReviewHours.push(Math.max(0, (first - created) / 3_600_000));
    } else if (
      (pr.status === 'open' || pr.status === 'draft') &&
      Number.isFinite(created) &&
      now.getTime() - created > REVIEW_WAITING_DAYS * 86_400_000
    ) {
      waitingPrs += 1;
    }
  }

  return {
    available: true,
    sampledPrs: prs.length,
    reviewedPrs,
    reviewComments,
    medianCommentsPerReviewedPr: median(perReviewedPr),
    medianFirstReviewHours: roundOne(median(firstReviewHours)),
    outdatedSharePercent: reviewComments > 0 ? Math.round((outdated / reviewComments) * 100) : null,
    appsecComments,
    waitingPrs,
    topReviewers: [...byReviewer.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([slug, comments]) => ({ slug, comments })),
    collectedAt,
  };
}

/**
 * Собирает комментарии последних PR и сводит их. `prs` — уже полученная
 * выборка (из фактов анализа); берём самые свежие по дате создания.
 */
export async function collectReviewStats(
  client: SourcecraftClient,
  org: string,
  repo: string,
  prs: PullRequest[],
  options: { deadline?: number } = {},
): Promise<ReviewStats> {
  const sample = [...prs]
    .filter((pr) => Boolean(pr.slug))
    .sort((a, b) => Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? ''))
    .slice(0, REVIEW_SAMPLE_PRS);
  const commentsBySlug = new Map<string, PullRequestComment[]>();
  let failed = 0;
  await Promise.all(
    sample.map(async (pr) => {
      if (options.deadline && Date.now() > options.deadline) return;
      try {
        const comments = await client.collect<'pull_request_comments', PullRequestComment>(
          (p) =>
            client.listPullRequestComments(org, repo, pr.slug!, p) as Promise<{
              pull_request_comments?: PullRequestComment[];
              next_page_token?: string;
            }>,
          'pull_request_comments',
          COMMENTS_PER_PR_LIMIT,
        );
        commentsBySlug.set(pr.slug!, comments);
      } catch {
        failed += 1;
      }
    }),
  );
  if (sample.length > 0 && failed === sample.length) {
    return { available: false, reason: 'comments_fetch_failed', collectedAt: new Date().toISOString() };
  }
  // PR, чьи комментарии не получили, в сводку не берём: иначе они выглядели
  // бы «без ревью».
  return summarizeReviews(
    sample.filter((pr) => commentsBySlug.has(pr.slug!)),
    commentsBySlug,
  );
}

/** Разбор сохранённой сводки из jsonb. */
export function pickReviewStats(raw: unknown): ReviewStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as { available?: unknown };
  return typeof value.available === 'boolean' ? (raw as ReviewStats) : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function roundOne(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}
