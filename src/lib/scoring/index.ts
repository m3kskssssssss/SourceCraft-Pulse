// Главная функция скоринга. Ничего не знает про БД или AI — только преобразует
// RepoFacts → AnalysisResult детерминированно.
//
// Алгоритм:
//   1) Считаем все метрики четырёх категорий.
//   2) Внутри категории отфильтровываем unknown, нормируем веса известных
//      метрик, считаем среднее взвешенное. Категория без известных метрик = null.
//   3) Общий балл = среднее по категориям с известными баллами,
//      с нормировкой CATEGORY_WEIGHTS среди known-категорий.
//   4) Применяем штрафы (секрет в истории, критическая CVE без исправлений, нет лицензии).
//   5) clamp(0..100), округляем до целого.
//   6) Строим рекомендации (см. recommendations.ts).

import type { RepoFacts } from '../collect';
import { CATEGORY_WEIGHTS, PENALTIES } from './config';
import { computeActivityMetrics } from './metrics/activity';
import { computeCodeMetrics } from './metrics/code';
import { computeSecurityMetrics } from './metrics/security';
import { computeDocsMetrics } from './metrics/docs';
import { clamp } from './normalize';
import { buildRecommendations } from './recommendations';
import type {
  AnalysisResult,
  AppliedPenalty,
  CategoryKey,
  CategoryScore,
  MetricScore,
} from './types';

export type AiCategoryScore = { value: number; summary?: string };

export type ScoreRepoOptions = {
  /**
   * Если задан — категория `docs` целиком заменяется этим баллом от AI-рубрики.
   * Метрики документации при этом свёрнутся в одну виртуальную «docs.ai_rubric»
   * с весом 1.0 внутри категории.
   */
  aiDocsScore?: AiCategoryScore | null;
  /**
   * То же для категории `code`: балл AI-ревью по выборке исходников заменяет
   * измеримые метрики виртуальной «code.ai_review». Если ревью не прошло,
   * категория считается по code-facts как обычно.
   */
  aiCodeScore?: AiCategoryScore | null;
};

export function scoreRepo(facts: RepoFacts, options: ScoreRepoOptions = {}): AnalysisResult {
  const docsMetrics = aiOverride('docs', 'docs.ai_rubric', options.aiDocsScore, () =>
    computeDocsMetrics(facts),
  );
  const codeMetrics = aiOverride('code', 'code.ai_review', options.aiCodeScore, () =>
    computeCodeMetrics(facts),
  );

  const metrics: MetricScore[] = [
    ...computeActivityMetrics(facts),
    ...codeMetrics,
    ...computeSecurityMetrics(facts),
    ...docsMetrics,
  ];

  const categoryScores = buildCategoryScores(metrics);
  const scoreBeforePenalties = computeOverall(categoryScores);
  const penalties = computePenalties(facts);
  const totalPenalty = penalties.reduce((sum, p) => sum + p.amount, 0);

  const score = Math.round(clamp(scoreBeforePenalties - totalPenalty));
  const recommendations = buildRecommendations({
    facts,
    metrics,
    baseScore: score,
  });

  return {
    score,
    scoreBeforePenalties: round1(scoreBeforePenalties),
    categoryScores,
    penalties,
    recommendations,
    missing: [...facts.missing],
  };
}

/**
 * Балл категории от ИИ вместо набора метрик. Виртуальная метрика получает
 * вес 1.0, то есть внутри категории она одна и определяет её целиком.
 * Рекомендаций у неё нет: править «оценку модели» пользователю некуда,
 * конкретика приходит отдельным списком находок.
 */
function aiOverride(
  category: CategoryKey,
  key: string,
  ai: AiCategoryScore | null | undefined,
  fallback: () => MetricScore[],
): MetricScore[] {
  if (ai === undefined || ai === null) return fallback();
  return [
    {
      key,
      category,
      weight: 1,
      value: clamp(ai.value),
      hint: ai.summary ?? 'Оценка от ИИ',
    },
  ];
}

// ---------- Категории ----------

const CATEGORIES: readonly CategoryKey[] = ['activity', 'code', 'security', 'docs'] as const;

export function buildCategoryScores(metrics: MetricScore[]): CategoryScore[] {
  return CATEGORIES.map((cat) => buildCategory(cat, metrics));
}

function buildCategory(category: CategoryKey, metrics: MetricScore[]): CategoryScore {
  const inCategory = metrics.filter((m) => m.category === category);
  const known = inCategory.filter((m): m is Extract<MetricScore, { unknown?: false }> => !m.unknown);

  if (known.length === 0) {
    return {
      key: category,
      value: null,
      appliedWeightSum: 0,
      metrics: inCategory,
    };
  }

  const totalWeight = known.reduce((sum, m) => sum + m.weight, 0);
  const weightedSum = known.reduce((sum, m) => sum + m.value * m.weight, 0);
  const value = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    key: category,
    value: round1(value),
    appliedWeightSum: totalWeight,
    metrics: inCategory,
  };
}

// ---------- Общий балл ----------

export function computeOverall(categoryScores: CategoryScore[]): number {
  const known = categoryScores.filter(
    (c): c is CategoryScore & { value: number } => c.value !== null,
  );
  if (known.length === 0) return 0;
  const totalWeight = known.reduce((sum, c) => sum + CATEGORY_WEIGHTS[c.key], 0);
  const weightedSum = known.reduce((sum, c) => sum + c.value * CATEGORY_WEIGHTS[c.key], 0);
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ---------- Штрафы ----------

export function computePenalties(facts: RepoFacts): AppliedPenalty[] {
  const penalties: AppliedPenalty[] = [];

  if (facts.gitHistory.available && facts.gitHistory.secretHits.length > 0) {
    penalties.push({
      key: 'secret_in_code',
      amount: PENALTIES.secretInCode,
      reason: `Найдены признаки секретов в коде: ${facts.gitHistory.secretHits
        .map((s) => s.name)
        .join(', ')}`,
    });
  }

  const hasUnfixedCritical =
    facts.security.available &&
    facts.security.vulnerabilities.some(
      (v) => v.severity === 'critical' && (!v.fixedIn || v.fixedIn.length === 0),
    );
  if (hasUnfixedCritical) {
    penalties.push({
      key: 'critical_vuln_unfixed',
      amount: PENALTIES.criticalVulnUnfixed,
      reason: 'Есть критическая уязвимость без исправлений',
    });
  }

  // Штраф за отсутствие лицензии применяется только если мы точно уверены — дерево получено.
  const treeKnown = !facts.missing.some(
    (m) => m === 'tree_fetch_failed' || m.startsWith('tree_fetch_failed:'),
  );
  if (treeKnown && !facts.tree.flags.hasLicense) {
    penalties.push({
      key: 'missing_license',
      amount: PENALTIES.missingLicense,
      reason: 'Файл LICENSE не найден',
    });
  }

  return penalties;
}

// ---------- helpers ----------

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
