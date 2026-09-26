// Публичный отчёт об анализе в JSON — для API (curl, скрипты, CI).
//
// Только то, что и так видно на публичной странице анализа: балл, категории,
// метрики, штрафы, рекомендации, пробелы. Личные данные владельца (AppSec
// публичного репозитория, прогоны CI, полная оценка) сюда не попадают.

import { and, desc, eq, ilike } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, repositories } from '@/db/schema';
import { CATEGORY_TITLES, categoryOrder, categoryWeightPercent } from './category-meta';
import { metricLabel } from './metric-labels';
import { describeMissingList } from './missing-labels';
import { pickRatingExclusion, RATING_EXCLUSION_LABELS } from './rating-eligibility';
import { computeCoverage } from './scoring/coverage';
import type { AppliedPenalty, CategoryKey, CategoryScore, MetricScore, Recommendation } from './scoring/types';

type AnalysisRow = typeof analyses.$inferSelect;
type RepositoryRow = typeof repositories.$inferSelect;

export type PublicReport = {
  id: string;
  repository: { org: string; repo: string; url: string | null; language: string | null };
  status: string;
  /** null — балла нет: анализ не закончен или это «полезный материал». */
  score: number | null;
  kind: string;
  /** Доля измеренных весов, 0..1. */
  coverage: number | null;
  analyzedAt: string | null;
  /** Почему нет места в рейтинге (форк, зеркало, шаблон, копия шаблона). */
  unranked: string | null;
  categories: Array<{
    key: string;
    title: string;
    weightPercent: number | null;
    score: number | null;
    metrics: Array<{ key: string; title: string; score: number | null; hint: string | null }>;
  }>;
  penalties: Array<{ key: string; amount: number; reason: string }>;
  recommendations: Array<{
    title: string;
    category: string;
    metric: string;
    effort: string;
    gain: number;
  }>;
  missing: Array<{ text: string; detail: string | null }>;
  links: { page: string; markdown: string; badge: string };
};

/** Последний опубликованный и посчитанный анализ репозитория (слаг без учёта регистра). */
export async function findLatestPublicAnalysis(
  org: string,
  repo: string,
): Promise<{ analysis: AnalysisRow; repository: RepositoryRow } | null> {
  const rows = await db
    .select({ analysis: analyses, repository: repositories })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(
      and(
        ilike(repositories.orgSlug, org),
        ilike(repositories.repoSlug, repo),
        eq(analyses.isPublic, true),
        eq(analyses.status, 'done'),
      ),
    )
    .orderBy(desc(analyses.finishedAt))
    .limit(1);
  return rows[0] ?? null;
}

export function buildPublicReport(
  analysis: AnalysisRow,
  repository: RepositoryRow,
  origin: string,
): PublicReport {
  const categories = (Array.isArray(analysis.categoryScores) ? analysis.categoryScores : []) as CategoryScore[];
  const recommendations = (
    Array.isArray(analysis.recommendations) ? analysis.recommendations : []
  ) as Recommendation[];
  const penalties = ((analysis.metrics as { penalties?: unknown } | null)?.penalties ?? []) as AppliedPenalty[];
  const missing = describeMissingList(
    (Array.isArray(analysis.missing) ? analysis.missing : []).filter((m): m is string => typeof m === 'string'),
  );
  const unranked = pickRatingExclusion(analysis.metrics);
  const kind = analysis.kind ?? 'project';

  return {
    id: analysis.id,
    repository: {
      org: repository.orgSlug,
      repo: repository.repoSlug,
      url: repository.webUrl ?? null,
      language: repository.language ?? null,
    },
    status: analysis.status,
    score: kind === 'material' ? null : (analysis.score ?? null),
    kind,
    coverage: roundTo(computeCoverage(analysis.categoryScores), 3),
    analyzedAt: analysis.finishedAt ? analysis.finishedAt.toISOString() : null,
    unranked: unranked ? RATING_EXCLUSION_LABELS[unranked] : null,
    categories: [...categories]
      .sort((a, b) => categoryOrder(a.key) - categoryOrder(b.key))
      .map((c) => ({
        key: c.key,
        title: CATEGORY_TITLES[c.key] ?? c.key,
        weightPercent: c.key in CATEGORY_TITLES ? categoryWeightPercent(c.key as CategoryKey) : null,
        score: typeof c.value === 'number' ? Math.round(c.value) : null,
        metrics: (c.metrics as MetricScore[]).map((m) => ({
          key: m.key,
          title: metricLabel(m.key),
          score: m.unknown ? null : Math.round(m.value),
          hint: m.hint ?? null,
        })),
      })),
    penalties: penalties.map((p) => ({ key: p.key, amount: p.amount, reason: p.reason })),
    recommendations: recommendations.map((r) => ({
      title: r.title,
      category: r.category,
      metric: r.key,
      effort: r.effort,
      gain: Math.round(r.gain * 10) / 10,
    })),
    missing: missing.map((n) => ({ text: n.text, detail: n.detail ?? null })),
    links: {
      page: `${origin}/a/${analysis.id}`,
      markdown: `${origin}/a/${analysis.id}/report.md`,
      badge: `${origin}/api/badge/${repository.orgSlug}/${repository.repoSlug}.svg`,
    },
  };
}

function roundTo(value: number | null, digits: number): number | null {
  if (value === null) return null;
  const k = 10 ** digits;
  return Math.round(value * k) / k;
}
