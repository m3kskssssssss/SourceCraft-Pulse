// Строит список рекомендаций по подтягиванию слабых метрик.
//
// Приросты считаются по очереди, а не независимо. Для каждого шага берём
// метрики, уже «подкрученные» предыдущими советами, и смотрим, сколько
// добавит следующий. Из кандидатов выбираем лучший по gain/effort, применяем
// его и идём дальше.
//
// Так сделано ради арифметики, которую видит пользователь. Раньше каждый
// прирост считался от одной и той же базы, и при трёх советах это ещё
// сходилось, а при девяти сумма легко переваливала за сто: балл 62, а под
// ним девять «+8» — обещание набрать 134 из 100. При последовательном счёте
// сумма приростов равна разнице между итоговым баллом и текущим, то есть
// «сделайте всё из списка» честно упирается в 100.
//
// Обратная сторона: порядок теперь значим, и один и тот же совет ниже по
// списку стоит меньше, чем наверху. Это правда про оценку — категории
// нормируются, и вторая правка в той же категории приносит меньше первой.

import type { RepoFacts } from '../collect';
import { EFFORT, RECOMMENDATIONS_LIMIT } from './config';
import { computeOverall, buildCategoryScores, computePenalties } from './index';
import { clamp } from './normalize';
import type { AppliedPenalty, MetricScore, Recommendation } from './types';

// Человекочитаемые заголовки (RU) по kind рекомендации. AI-варианты
// перекрываются задачей recommendation_copy.
const RECOMMENDATION_TITLES: Record<string, string> = {
  increase_commit_frequency: 'Наращивайте темп разработки',
  grow_team: 'Привлекайте ещё контрибьюторов',
  commit_recently: 'Зафиксируйте активность свежим коммитом',
  reduce_bus_factor: 'Распределите нагрузку между авторами',
  cut_release: 'Выпустите релиз и поставьте тег версии',
  use_pull_requests: 'Проводите изменения через pull request',
  close_issues: 'Доводите задачи в трекере до закрытия',
  add_tests: 'Добавьте автотесты',
  add_linter: 'Подключите линтер',
  add_ci: 'Настройте CI',
  add_build_manifest: 'Заведите манифест сборки',
  add_gitignore: 'Добавьте .gitignore',
  add_editorconfig: 'Добавьте .editorconfig',
  split_long_files: 'Разбейте самые длинные файлы',
  explain_code: 'Поясните неочевидные места в коде',
  close_todo: 'Разберите накопленные TODO',
  fix_critical_vulns: 'Закройте критические уязвимости',
  fix_high_vulns: 'Закройте high-уязвимости',
  fix_medium_vulns: 'Закройте medium-уязвимости',
  add_lockfile: 'Зафиксируйте версии зависимостей',
  add_dependency_bot: 'Включите автообновление зависимостей',
  update_dependencies: 'Обновите зависимости',
  add_readme: 'Добавьте README',
  expand_readme: 'Расширьте README (разделы, длина)',
  add_license: 'Добавьте LICENSE',
  add_contributing: 'Опишите правила контрибьюции',
  add_changelog: 'Заведите CHANGELOG',
  add_usage_examples: 'Приведите примеры использования',
  add_docs_dir: 'Вынесите документацию в docs/',
  add_code_of_conduct: 'Добавьте CODE_OF_CONDUCT',
  add_issue_template: 'Заведите шаблоны задач и PR',
  add_repo_description: 'Заполните описание репозитория',
};

/** Метрика, которую можно подтянуть: известная, с порогом и оценкой усилий. */
type Candidate = Extract<MetricScore, { unknown?: false }> & {
  target: number;
  effort: keyof typeof EFFORT;
  recommendationKind: string;
};

type BuildInput = {
  facts: RepoFacts;
  metrics: MetricScore[];
  baseScore: number;
};

export function buildRecommendations(input: BuildInput): Recommendation[] {
  const { facts, metrics, baseScore } = input;

  const candidates = metrics.filter(isCandidate);
  const basePenalties = computePenalties(facts);

  const result: Recommendation[] = [];
  // Состояние «что уже посоветовали»: метрики с подтянутыми значениями и
  // снятые этими советами штрафы.
  let currentMetrics = metrics;
  let fixedKeys = new Set<string>();
  let currentScore = baseScore;

  while (result.length < RECOMMENDATIONS_LIMIT) {
    let best: { candidate: Candidate; gain: number; gainPerEffort: number } | null = null;

    for (const candidate of candidates) {
      if (fixedKeys.has(candidate.key)) continue;
      const nextMetrics = applyFix(currentMetrics, candidate);
      const nextScore = scoreWith(nextMetrics, basePenalties, union(fixedKeys, candidate.key));
      const gain = nextScore - currentScore;
      if (gain <= 0) continue;
      const gainPerEffort = gain / EFFORT[candidate.effort];
      if (!best || gainPerEffort > best.gainPerEffort) {
        best = { candidate, gain, gainPerEffort };
      }
    }

    if (!best) break;

    result.push({
      key: best.candidate.key,
      category: best.candidate.category,
      title:
        RECOMMENDATION_TITLES[best.candidate.recommendationKind] ??
        best.candidate.recommendationKind,
      effort: best.candidate.effort,
      gain: round1(best.gain),
      gainPerEffort: round4(best.gainPerEffort),
    });

    currentMetrics = applyFix(currentMetrics, best.candidate);
    fixedKeys = union(fixedKeys, best.candidate.key);
    currentScore += best.gain;
  }

  return result;
}

function isCandidate(metric: MetricScore): metric is Candidate {
  if (metric.unknown) return false;
  if (metric.target === undefined || metric.value >= metric.target) return false;
  if (!metric.effort) return false;
  if (!metric.recommendationKind) return false;
  return true;
}

/** Метрика с подтянутым до target значением; остальные — как были. */
function applyFix(metrics: MetricScore[], candidate: Candidate): MetricScore[] {
  return metrics.map((m) => (m.key === candidate.key ? { ...candidate, value: candidate.target } : m));
}

/** Балл на наборе метрик с учётом штрафов, которые ещё не сняты советами. */
function scoreWith(
  metrics: MetricScore[],
  basePenalties: AppliedPenalty[],
  fixedKeys: Set<string>,
): number {
  const categoryScores = buildCategoryScores(metrics);
  const before = computeOverall(categoryScores);
  const penalties = basePenalties.filter((p) => !penaltyClearedBy(p, fixedKeys));
  const total = penalties.reduce((sum, p) => sum + p.amount, 0);
  return Math.round(clamp(before - total));
}

/**
 * Снимает ли набор выполненных советов этот штраф. Добавить LICENSE — значит
 * закрыть штраф за его отсутствие; закрыть критические уязвимости — штраф за
 * неисправленную critical. Штраф за секрет в истории так не снимается: убрать
 * секрет из прошлых коммитов метрикой не описывается.
 */
function penaltyClearedBy(penalty: AppliedPenalty, fixedKeys: Set<string>): boolean {
  if (penalty.key === 'missing_license') return fixedKeys.has('docs.license');
  if (penalty.key === 'critical_vuln_unfixed') return fixedKeys.has('security.critical_vulns');
  return false;
}

function union(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  next.add(value);
  return next;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
