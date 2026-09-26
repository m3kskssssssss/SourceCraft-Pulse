// Метрики категории «Задачи».
//
// Считаем по выборке issue из API: доводят ли задачи до конца, сколько
// открытых заброшено и как быстро за задачу берутся. Репозиторий без трекера
// не болен — он им не пользуется: категория «нет данных», и её вес уходит
// другим, а не превращается в ноль.

import type { RepoFacts } from '../../collect';
import type { Issue } from '../../sourcecraft/client';
import {
  CLOSED_ISSUES_SHARE_TARGET,
  ISSUE_REACTION_DAYS_BEST,
  ISSUE_REACTION_DAYS_WORST,
  ISSUES_WEIGHTS,
  STALE_ISSUE_DAYS,
  STALE_ISSUES_SHARE_BEST,
  STALE_ISSUES_SHARE_WORST,
} from '../config';
import { invertedLinearScore, linearScore } from '../normalize';
import { isUnknown } from '../facts-helpers';
import type { MetricScore } from '../types';

const CATEGORY = 'issues' as const;
const DAY_MS = 86_400_000;

export function computeIssuesMetrics(facts: RepoFacts): MetricScore[] {
  const sample = facts.issues;
  if (sample.length === 0) {
    const hint = isUnknown(facts, 'issues_fetch_failed')
      ? 'Список задач недоступен'
      : 'Трекером задач не пользуются';
    return [
      unknownMetric('issues.closed_share', ISSUES_WEIGHTS.closedShare, hint),
      unknownMetric('issues.stale_share', ISSUES_WEIGHTS.staleShare, hint),
      unknownMetric('issues.reaction_time', ISSUES_WEIGHTS.reactionTime, hint),
    ];
  }
  const now = Date.parse(facts.collectedAt) || Date.now();
  return [closedShareMetric(sample), staleShareMetric(sample, now), reactionTimeMetric(sample)];
}

/** Доля закрытых по выборке, а не по всему трекеру: выборка ограничена. */
function closedShareMetric(sample: Issue[]): MetricScore {
  const closed = sample.filter((i) => Boolean(i.completed_at)).length;
  const share = (closed / sample.length) * 100;
  return {
    key: 'issues.closed_share',
    category: CATEGORY,
    weight: ISSUES_WEIGHTS.closedShare,
    value: linearScore(share, { min: 0, max: CLOSED_ISSUES_SHARE_TARGET }),
    hint: `Закрыто ${closed} из ${sample.length} задач выборки`,
    target: 100,
    effort: 'medium',
    recommendationKind: 'close_issues',
  };
}

/** Открытые задачи без движения дольше STALE_ISSUE_DAYS. */
function staleShareMetric(sample: Issue[], now: number): MetricScore {
  const open = sample.filter((i) => !i.completed_at);
  if (open.length === 0) {
    return {
      key: 'issues.stale_share',
      category: CATEGORY,
      weight: ISSUES_WEIGHTS.staleShare,
      value: 100,
      hint: 'Открытых задач нет',
      target: 100,
    };
  }
  const stale = open.filter((i) => {
    const touched = Date.parse(i.updated_at ?? i.created_at ?? '');
    return Number.isFinite(touched) && now - touched > STALE_ISSUE_DAYS * DAY_MS;
  }).length;
  const share = (stale / open.length) * 100;
  return {
    key: 'issues.stale_share',
    category: CATEGORY,
    weight: ISSUES_WEIGHTS.staleShare,
    value: invertedLinearScore(share, { best: STALE_ISSUES_SHARE_BEST, worst: STALE_ISSUES_SHARE_WORST }),
    hint:
      stale === 0
        ? 'Заброшенных задач нет'
        : `Без движения больше ${STALE_ISSUE_DAYS} дней: ${stale} из ${open.length} открытых`,
    target: 100,
    effort: 'small',
    recommendationKind: 'triage_stale_issues',
  };
}

/**
 * Реакция: медиана дней от создания задачи до того, как её взяли в работу
 * или закрыли. Комментариев в выборке нет, а обходить их по каждой задаче —
 * это десятки запросов к API; смена статуса — честный след реакции.
 */
function reactionTimeMetric(sample: Issue[]): MetricScore {
  const days = sample
    .map((i) => {
      const created = Date.parse(i.created_at ?? '');
      const moved = [i.started_at, i.completed_at]
        .map((d) => Date.parse(d ?? ''))
        .filter((t) => Number.isFinite(t));
      if (!Number.isFinite(created) || moved.length === 0) return null;
      return Math.max(0, (Math.min(...moved) - created) / DAY_MS);
    })
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);
  if (days.length === 0) {
    return unknownMetric(
      'issues.reaction_time',
      ISSUES_WEIGHTS.reactionTime,
      'Ни одну задачу выборки ещё не брали в работу',
    );
  }
  const median = days[Math.floor(days.length / 2)] ?? 0;
  return {
    key: 'issues.reaction_time',
    category: CATEGORY,
    weight: ISSUES_WEIGHTS.reactionTime,
    value: invertedLinearScore(median, { best: ISSUE_REACTION_DAYS_BEST, worst: ISSUE_REACTION_DAYS_WORST }),
    hint: `Обычно за задачу берутся через ${formatDays(median)}`,
    target: 100,
    effort: 'medium',
    recommendationKind: 'react_to_issues',
  };
}

function formatDays(days: number): string {
  if (days < 1) return 'день';
  const n = Math.round(days);
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'день'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'дня'
        : 'дней';
  return `${n} ${word}`;
}

function unknownMetric(key: string, weight: number, hint: string): MetricScore {
  return { key, category: CATEGORY, weight, value: null, unknown: true, hint };
}
