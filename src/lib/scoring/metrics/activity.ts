// Метрики категории «Активность».

import type { RepoFacts } from '../../collect';
import {
  ACTIVE_AUTHORS_TARGET,
  ACTIVITY_WEIGHTS,
  BUS_FACTOR_HEALTHY_SHARE,
  BUS_FACTOR_MIN_SCORE,
  COMMITS_90D_TARGET,
  FRESHNESS_MAX_STALE_DAYS,
} from '../config';
import { clamp, invertedLinearScore, logScore } from '../normalize';
import type { MetricScore } from '../types';

const CATEGORY = 'activity' as const;

export function computeActivityMetrics(facts: RepoFacts): MetricScore[] {
  return [
    commitsMetric(facts),
    activeAuthorsMetric(facts),
    freshnessMetric(facts),
    busFactorMetric(facts),
  ];
}

function commitsMetric(facts: RepoFacts): MetricScore {
  const gh = facts.gitHistory;
  if (!gh.available || gh.commitsLast90Days === null) {
    return {
      key: 'activity.commits_90d',
      category: CATEGORY,
      weight: ACTIVITY_WEIGHTS.commitsLast90Days,
      value: null,
      unknown: true,
      hint: 'Не удалось получить git-историю',
    };
  }
  const value = logScore(gh.commitsLast90Days, { target: COMMITS_90D_TARGET });
  return {
    key: 'activity.commits_90d',
    category: CATEGORY,
    weight: ACTIVITY_WEIGHTS.commitsLast90Days,
    value,
    hint: `Коммитов за 90 дней: ${gh.commitsLast90Days}`,
    target: 60,
    effort: 'medium',
    recommendationKind: 'increase_commit_frequency',
  };
}

function activeAuthorsMetric(facts: RepoFacts): MetricScore {
  const gh = facts.gitHistory;
  if (!gh.available || gh.uniqueAuthorsLast90Days === null) {
    return {
      key: 'activity.active_authors',
      category: CATEGORY,
      weight: ACTIVITY_WEIGHTS.activeAuthors,
      value: null,
      unknown: true,
      hint: 'Не удалось получить git-историю',
    };
  }
  const value = logScore(gh.uniqueAuthorsLast90Days, { target: ACTIVE_AUTHORS_TARGET });
  return {
    key: 'activity.active_authors',
    category: CATEGORY,
    weight: ACTIVITY_WEIGHTS.activeAuthors,
    value,
    hint: `Активных авторов за 90 дней: ${gh.uniqueAuthorsLast90Days}`,
    target: 70,
    effort: 'large',
    recommendationKind: 'grow_team',
  };
}

function freshnessMetric(facts: RepoFacts): MetricScore {
  const gh = facts.gitHistory;
  if (!gh.available || !gh.lastCommitDate) {
    return {
      key: 'activity.freshness',
      category: CATEGORY,
      weight: ACTIVITY_WEIGHTS.freshness,
      value: null,
      unknown: true,
      hint: 'Не удалось определить дату последнего коммита',
    };
  }
  const days = Math.max(0, (Date.now() - Date.parse(gh.lastCommitDate)) / (24 * 3600 * 1000));
  const value = invertedLinearScore(days, { best: 0, worst: FRESHNESS_MAX_STALE_DAYS });
  return {
    key: 'activity.freshness',
    category: CATEGORY,
    weight: ACTIVITY_WEIGHTS.freshness,
    value,
    hint: `Последний коммит: ${Math.round(days)} дн. назад`,
    target: 80,
    effort: 'small',
    recommendationKind: 'commit_recently',
  };
}

function busFactorMetric(facts: RepoFacts): MetricScore {
  const gh = facts.gitHistory;
  if (!gh.available || gh.topAuthorSharePercent === null) {
    return {
      key: 'activity.bus_factor',
      category: CATEGORY,
      weight: ACTIVITY_WEIGHTS.busFactor,
      value: null,
      unknown: true,
      hint: 'Не удалось посчитать долю кода топ-автора',
    };
  }
  // 0..BUS_FACTOR_HEALTHY_SHARE% → 100, дальше линейно вниз до BUS_FACTOR_MIN_SCORE при 100%.
  const share = gh.topAuthorSharePercent;
  let value: number;
  if (share <= BUS_FACTOR_HEALTHY_SHARE) {
    value = 100;
  } else {
    const range = 100 - BUS_FACTOR_HEALTHY_SHARE;
    const overflow = share - BUS_FACTOR_HEALTHY_SHARE;
    value = clamp(100 - (overflow / range) * (100 - BUS_FACTOR_MIN_SCORE));
  }
  return {
    key: 'activity.bus_factor',
    category: CATEGORY,
    weight: ACTIVITY_WEIGHTS.busFactor,
    value,
    hint: `Доля кода топ-автора: ${share}%`,
    target: 80,
    effort: 'large',
    recommendationKind: 'reduce_bus_factor',
  };
}
