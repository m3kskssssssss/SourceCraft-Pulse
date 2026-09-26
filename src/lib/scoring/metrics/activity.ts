// Метрики категории «Активность».

import type { RepoFacts } from '../../collect';
import {
  ACTIVE_AUTHORS_TARGET,
  ACTIVITY_WEIGHTS,
  BUS_FACTOR_HEALTHY_SHARE,
  BUS_FACTOR_MIN_SCORE,
  COMMITS_90D_TARGET,
  FRESHNESS_MAX_STALE_DAYS,
  PULL_REQUESTS_TARGET,
  RELEASES_TARGET,
} from '../config';
import { clamp, invertedLinearScore, logScore } from '../normalize';
import { isUnknown } from '../facts-helpers';
import type { MetricScore } from '../types';

const CATEGORY = 'activity' as const;

export function computeActivityMetrics(facts: RepoFacts): MetricScore[] {
  return [
    commitsMetric(facts),
    activeAuthorsMetric(facts),
    freshnessMetric(facts),
    busFactorMetric(facts),
    releasesMetric(facts),
    pullRequestFlowMetric(facts),
  ];
}

/**
 * Релизы и теги: у живого проекта версии выпускают, а не «берите главную
 * ветку». Считаем и релизы, и теги — тег без оформленного релиза тоже
 * означает, что версию зафиксировали.
 */
function releasesMetric(facts: RepoFacts): MetricScore {
  // Пустой список после неудачного запроса — это не «релизов нет», а «мы не
  // знаем». Ноль ставим только когда оба списка действительно получены.
  if (isUnknown(facts, 'releases_fetch_failed') && isUnknown(facts, 'tags_fetch_failed')) {
    return {
      key: 'activity.releases',
      category: CATEGORY,
      weight: ACTIVITY_WEIGHTS.releases,
      value: null,
      unknown: true,
      hint: 'Списки релизов и тегов недоступны',
    };
  }
  const count = facts.releases.length + facts.tags.length;
  return {
    key: 'activity.releases',
    category: CATEGORY,
    weight: ACTIVITY_WEIGHTS.releases,
    value: logScore(count, { target: RELEASES_TARGET }),
    hint: count === 0 ? 'Релизов и тегов нет' : `Релизов и тегов: ${count}`,
    target: 100,
    effort: 'small',
    recommendationKind: 'cut_release',
  };
}

/**
 * Поток изменений через pull request. Смотрим только на их число: статусы в
 * спецификации есть, но что именно считать «принятым», она не определяет, а
 * выдумывать не станем.
 */
function pullRequestFlowMetric(facts: RepoFacts): MetricScore {
  if (facts.counters.pullRequests === null && isUnknown(facts, 'pull_requests_fetch_failed')) {
    return {
      key: 'activity.pr_flow',
      category: CATEGORY,
      weight: ACTIVITY_WEIGHTS.pullRequestFlow,
      value: null,
      unknown: true,
      hint: 'Список pull request недоступен',
    };
  }
  const count = facts.counters.pullRequests ?? facts.pullRequests.length;
  return {
    key: 'activity.pr_flow',
    category: CATEGORY,
    weight: ACTIVITY_WEIGHTS.pullRequestFlow,
    value: logScore(count, { target: PULL_REQUESTS_TARGET }),
    hint: count === 0 ? 'Pull request не используются' : `Pull request: ${count}`,
    target: 100,
    effort: 'medium',
    recommendationKind: 'use_pull_requests',
  };
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
