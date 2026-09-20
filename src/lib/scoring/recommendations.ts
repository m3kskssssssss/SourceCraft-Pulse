// Строит топ-3 рекомендации по подтягиванию слабых метрик.
//
// Метод: для каждой метрики, у которой value < target, симулируем
// «подкрутили эту метрику до target» и пересчитываем общий балл. Разница
// с текущим — это gain. Сортируем по gain/effort_units.
//
// Гейны аддитивны, потому что веса метрик и категорий фиксированы, а
// unknown-набор не меняется при подкрутке значения. Это ровно то свойство,
// что проверяется тестом «сумма приростов совпадает с пересчитанной оценкой».

import type { RepoFacts } from '../collect';
import { EFFORT } from './config';
import { computeOverall, buildCategoryScores, computePenalties } from './index';
import { clamp } from './normalize';
import type { MetricScore, Recommendation } from './types';

// Человекочитаемые заголовки (RU) по kind рекомендации. AI-варианты будут
// перекрываться на Этапе 4 через recommendation_kind.
const RECOMMENDATION_TITLES: Record<string, string> = {
  increase_commit_frequency: 'Наращивайте темп разработки',
  grow_team: 'Привлекайте ещё контрибьюторов',
  commit_recently: 'Зафиксируйте активность свежим коммитом',
  reduce_bus_factor: 'Распределите нагрузку между авторами',
  add_tests: 'Добавьте автотесты',
  add_linter: 'Подключите линтер',
  fix_critical_vulns: 'Закройте критические уязвимости',
  fix_high_vulns: 'Закройте high-уязвимости',
  add_lockfile: 'Зафиксируйте версии зависимостей',
  add_security_md: 'Добавьте SECURITY.md',
  update_dependencies: 'Обновите зависимости',
  add_readme: 'Добавьте README',
  expand_readme: 'Расширьте README (разделы, длина)',
  add_license: 'Добавьте LICENSE',
  add_contributing: 'Опишите правила контрибьюции',
  add_changelog: 'Заведите CHANGELOG',
  add_usage_examples: 'Приведите примеры использования',
};

type BuildInput = {
  facts: RepoFacts;
  metrics: MetricScore[];
  baseScore: number;
};

export function buildRecommendations(input: BuildInput): Recommendation[] {
  const { facts, metrics, baseScore } = input;

  const candidates: Recommendation[] = [];

  for (const metric of metrics) {
    if (metric.unknown) continue;
    if (metric.target === undefined || metric.value >= metric.target) continue;
    if (!metric.effort) continue;
    if (!metric.recommendationKind) continue;

    const simulatedMetrics: MetricScore[] = metrics.map((m) => {
      if (m.key !== metric.key) return m;
      // Мутируем только known-метрику; unknown до этой ветки не доходит.
      return { ...(metric as Extract<MetricScore, { unknown?: false }>), value: metric.target! };
    });
    const simulatedScore = simulateOverall(facts, simulatedMetrics, metric.key);
    const gain = simulatedScore - baseScore;
    if (gain <= 0) continue;

    const effortUnits = EFFORT[metric.effort];
    candidates.push({
      key: metric.key,
      category: metric.category,
      title: RECOMMENDATION_TITLES[metric.recommendationKind] ?? metric.recommendationKind,
      effort: metric.effort,
      gain: round1(gain),
      gainPerEffort: round4(gain / effortUnits),
    });
  }

  candidates.sort((a, b) => b.gainPerEffort - a.gainPerEffort);
  return candidates.slice(0, 3);
}

/** Пересчитывает общий балл с уже мутированным набором метрик. */
function simulateOverall(
  facts: RepoFacts,
  metrics: MetricScore[],
  fixedMetricKey: string,
): number {
  const categoryScores = buildCategoryScores(metrics);
  const scoreBefore = computeOverall(categoryScores);
  const penalties = computePenaltiesAfterFix(facts, fixedMetricKey);
  const totalPenalty = penalties.reduce((sum, p) => sum + p.amount, 0);
  return Math.round(clamp(scoreBefore - totalPenalty));
}

/**
 * Пересчитывает штрафы после «подкрутки» одной метрики.
 * Правило: если рекомендация напрямую устраняет условие штрафа (например,
 * добавить LICENSE устраняет missing_license), убираем этот штраф.
 * Остальные штрафы остаются как есть.
 */
function computePenaltiesAfterFix(facts: RepoFacts, fixedMetricKey: string) {
  const penalties = computePenalties(facts);
  if (fixedMetricKey === 'docs.license') {
    return penalties.filter((p) => p.key !== 'missing_license');
  }
  if (fixedMetricKey === 'security.critical_vulns') {
    return penalties.filter((p) => p.key !== 'critical_vuln_unfixed');
  }
  return penalties;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
