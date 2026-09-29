// Дополнительная аналитика отчёта: CODEOWNERS, пустые коммиты, ревью PR.
//
// В балл не входит — показывается в отчёте рядом с оценкой. Всё берётся из
// фактов, сохранённых в `analyses.metrics`, поэтому работает и для оценок,
// посчитанных до появления этих показателей:
//   - CODEOWNERS — по сохранённому дереву файлов;
//   - пустые коммиты — только у новых анализов (деревья коммитов в старых
//     фактах не сохранялись), у старых — «нет данных»;
//   - ревью — у новых анализов в фактах, у старых догружается при первом
//     открытии отчёта (ensureReviewStats) и сохраняется в `metrics.reviews`.

import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { analyses } from '../db/schema';
import { codeownersStatus, type CodeownersStatus } from './codeowners';
import type { RepoFacts } from './collect';
import { collectReviewStats, pickReviewStats, type ReviewStats } from './reviews';
import { getSourcecraftClient, type PullRequest } from './sourcecraft/client';

export type EmptyCommitsInfo =
  | { status: 'known'; empty: number; total: number }
  | { status: 'unknown'; reason: 'old_analysis' | 'no_history' };

export type ExtraAnalytics = {
  codeowners: CodeownersStatus;
  emptyCommits: EmptyCommitsInfo;
  /** null — сводки нет: старый приватный анализ или догрузка не удалась. */
  reviews: ReviewStats | null;
};

type StoredMetrics = {
  facts?: Partial<RepoFacts>;
  reviews?: unknown;
} | null;

/** Всё, что можно прочитать из сохранённых метрик без сети. */
export function readExtraAnalytics(metrics: unknown): ExtraAnalytics {
  const stored = (metrics ?? null) as StoredMetrics;
  const facts = stored?.facts ?? {};
  const gh = facts.gitHistory;

  let emptyCommits: EmptyCommitsInfo;
  if (!gh?.available || gh.commitsLast90Days == null) {
    emptyCommits = { status: 'unknown', reason: 'no_history' };
  } else if (typeof gh.emptyCommitsLast90Days === 'number') {
    emptyCommits = { status: 'known', empty: gh.emptyCommitsLast90Days, total: gh.commitsLast90Days };
  } else {
    emptyCommits = { status: 'unknown', reason: 'old_analysis' };
  }

  return {
    codeowners: codeownersStatus({
      tree: facts.tree ?? { entriesCount: 0, entries: [], flags: {} as RepoFacts['tree']['flags'] },
      missing: facts.missing ?? [],
    }),
    emptyCommits,
    reviews: pickReviewStats(facts.reviews) ?? pickReviewStats(stored?.reviews),
  };
}

/** Сколько ждём догрузку комментариев при открытии отчёта. */
const LAZY_REVIEWS_BUDGET_MS = 15_000;

/**
 * Сводка ревью для отчёта. Если её нет в фактах (анализ старый), собирает
 * по сохранённой выборке PR публичного репозитория и дописывает в
 * `metrics.reviews` — следующее открытие отчёта будет мгновенным. У
 * приватного репозитория без токена владельца догружать нечем: null.
 */
export async function ensureReviewStats(
  db: Db,
  analysis: { id: string; metrics: unknown },
  repo: { orgSlug: string; repoSlug: string; isPrivate: boolean },
): Promise<ReviewStats | null> {
  const current = readExtraAnalytics(analysis.metrics).reviews;
  if (current?.available) return current;
  if (repo.isPrivate) return current;

  const facts = ((analysis.metrics ?? null) as StoredMetrics)?.facts;
  // Список PR не получили при анализе — «PR нет» было бы неправдой.
  if (!Array.isArray(facts?.pullRequests) || (facts.missing ?? []).some((m) => m.startsWith('pull_requests_fetch_failed'))) {
    return current;
  }
  const prs = facts.pullRequests as PullRequest[];
  let stats: ReviewStats;
  try {
    stats = await collectReviewStats(getSourcecraftClient(), repo.orgSlug, repo.repoSlug, prs, {
      deadline: Date.now() + LAZY_REVIEWS_BUDGET_MS,
    });
  } catch {
    return current;
  }
  // Неудачу не сохраняем: при следующем открытии попробуем снова.
  if (!stats.available) return current;

  try {
    await db
      .update(analyses)
      .set({
        metrics: sql`jsonb_set(coalesce(${analyses.metrics}, '{}'::jsonb), '{reviews}', ${JSON.stringify(stats)}::jsonb)`,
      })
      .where(eq(analyses.id, analysis.id));
  } catch {
    // Не записалось — отчёт всё равно покажет свежую сводку.
  }
  return stats;
}
