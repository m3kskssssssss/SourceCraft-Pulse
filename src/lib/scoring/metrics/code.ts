// Метрики категории «Работа с кодом».
//
// prReviewShare и firstReviewMedianHours требуют per-PR запросов к
// /pulls/{id}/reviewers и /pulls/{id}/comments. В текущем сборщике мы
// эти данные не тянем (чтобы не выжигать API на больших репо), поэтому
// метрики помечаются как unknown. Их можно включить, добавив enrich-шаг
// в collect на будущих этапах.

import type { RepoFacts } from '../../collect';
import { CODE_WEIGHTS, PR_REVIEW_SHARE_TARGET, REVIEW_MEDIAN_HOURS_BEST, REVIEW_MEDIAN_HOURS_WORST } from '../config';
import { boolScore, invertedLinearScore, linearScore } from '../normalize';
import { isUnknown } from '../facts-helpers';
import type { MetricScore } from '../types';

const CATEGORY = 'code' as const;

export function computeCodeMetrics(facts: RepoFacts): MetricScore[] {
  return [
    prReviewShareMetric(facts),
    firstReviewMedianMetric(facts),
    hasTestsMetric(facts),
    hasLinterMetric(facts),
  ];
}

function prReviewShareMetric(facts: RepoFacts): MetricScore {
  // Данные о ревью по каждому PR не собирали — честно unknown.
  // См. комментарий в шапке файла.
  void facts;
  void PR_REVIEW_SHARE_TARGET;
  void linearScore;
  return {
    key: 'code.pr_review_share',
    category: CATEGORY,
    weight: CODE_WEIGHTS.prReviewShare,
    value: null,
    unknown: true,
    hint: 'Данные о ревьюерах PR не собирались',
  };
}

function firstReviewMedianMetric(facts: RepoFacts): MetricScore {
  void facts;
  void invertedLinearScore;
  void REVIEW_MEDIAN_HOURS_BEST;
  void REVIEW_MEDIAN_HOURS_WORST;
  return {
    key: 'code.first_review_median_hours',
    category: CATEGORY,
    weight: CODE_WEIGHTS.firstReviewMedianHours,
    value: null,
    unknown: true,
    hint: 'Данные о времени до первого ревью не собирались',
  };
}

function hasTestsMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: 'code.has_tests',
      category: CATEGORY,
      weight: CODE_WEIGHTS.hasTests,
      value: null,
      unknown: true,
      hint: 'Дерево файлов недоступно',
    };
  }
  const hasTests = facts.tree.flags.hasTestsDir;
  return {
    key: 'code.has_tests',
    category: CATEGORY,
    weight: CODE_WEIGHTS.hasTests,
    value: boolScore(hasTests),
    hint: hasTests ? 'Обнаружена директория тестов' : 'Тесты не найдены',
    target: 100,
    effort: 'medium',
    recommendationKind: 'add_tests',
  };
}

function hasLinterMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: 'code.has_linter',
      category: CATEGORY,
      weight: CODE_WEIGHTS.hasLinter,
      value: null,
      unknown: true,
      hint: 'Дерево файлов недоступно',
    };
  }
  const hasLinter = facts.tree.flags.hasLinterConfig;
  return {
    key: 'code.has_linter',
    category: CATEGORY,
    weight: CODE_WEIGHTS.hasLinter,
    value: boolScore(hasLinter),
    hint: hasLinter ? 'Обнаружен конфиг линтера' : 'Конфиг линтера не найден',
    target: 100,
    effort: 'small',
    recommendationKind: 'add_linter',
  };
}
