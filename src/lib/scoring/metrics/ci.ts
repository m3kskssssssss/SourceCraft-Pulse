// Метрики категории «CI/CD».
//
// Конфиг пайплайна лежит в самом репозитории — это публичные данные, их видит
// любой: есть ли CI, запускает ли он тесты и линтер, проверяет ли pull request.
// Прогоны SourceCraft отдаёт только участникам, поэтому доля успешных считается
// лишь у приватного репозитория по токену владельца. У публичного она в балл
// не входит: иначе место в рейтинге зависело бы от того, кто запустил оценку.

import type { RepoFacts } from '../../collect';
import { CI_SUCCESS_BEST, CI_SUCCESS_WORST, CI_WEIGHTS } from '../config';
import { boolScore, linearScore } from '../normalize';
import { isUnknown } from '../facts-helpers';
import type { MetricScore } from '../types';

const CATEGORY = 'ci' as const;

export function computeCiMetrics(facts: RepoFacts, options: { ownerView?: boolean } = {}): MetricScore[] {
  return [
    configPresentMetric(facts),
    ...pipelineMetrics(facts),
    runsSuccessMetric(facts, options.ownerView ?? false),
  ];
}

/** Публичный ли репозиторий. Не знаем — считаем публичным: так строже. */
export function isPublicRepo(facts: RepoFacts): boolean {
  const visibility = facts.repository?.visibility;
  return visibility !== 'private' && visibility !== 'internal';
}

function configPresentMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return unknownMetric('ci.config', CI_WEIGHTS.configPresent, 'Дерево файлов недоступно');
  }
  const has = facts.tree.flags.hasCiConfig;
  return {
    key: 'ci.config',
    category: CATEGORY,
    weight: CI_WEIGHTS.configPresent,
    value: boolScore(has),
    hint: has ? 'Конфиг CI есть' : 'Конфига CI нет',
    target: 100,
    effort: 'medium',
    recommendationKind: 'add_ci',
  };
}

/**
 * Что делает пайплайн — по тексту конфигов. Без конфига этих вопросов нет:
 * метрики неприменимы, и категорию держит одна «есть ли CI» — иначе один
 * пропуск превращался бы в четыре рекомендации.
 */
function pipelineMetrics(facts: RepoFacts): MetricScore[] {
  const specs = [
    {
      key: 'ci.runs_tests',
      weight: CI_WEIGHTS.runsTests,
      flag: (c: NonNullable<RepoFacts['ciConfig']>) => c.runsTests,
      yes: 'Пайплайн запускает тесты',
      no: 'В пайплайне не видно запуска тестов',
      effort: 'small' as const,
      recommendationKind: 'ci_run_tests',
    },
    {
      key: 'ci.runs_lint',
      weight: CI_WEIGHTS.runsLint,
      flag: (c: NonNullable<RepoFacts['ciConfig']>) => c.runsLint,
      yes: 'Пайплайн запускает линтер',
      no: 'В пайплайне не видно линтера',
      effort: 'small' as const,
      recommendationKind: 'ci_run_lint',
    },
    {
      key: 'ci.pr_checks',
      weight: CI_WEIGHTS.pullRequestChecks,
      flag: (c: NonNullable<RepoFacts['ciConfig']>) => c.runsOnPullRequests,
      yes: 'Pull request проверяются пайплайном',
      no: 'Пайплайн не срабатывает на pull request',
      effort: 'small' as const,
      recommendationKind: 'ci_check_prs',
    },
  ];

  return specs.map((spec): MetricScore => {
    if (!facts.tree.flags.hasCiConfig) {
      return unknownMetric(spec.key, spec.weight, 'Конфига CI нет — проверять нечего');
    }
    const config = facts.ciConfig;
    if (!config || config.files.length === 0) {
      return unknownMetric(spec.key, spec.weight, 'Конфиг CI прочитать не удалось');
    }
    const has = spec.flag(config);
    return {
      key: spec.key,
      category: CATEGORY,
      weight: spec.weight,
      value: boolScore(has),
      hint: has ? spec.yes : spec.no,
      target: 100,
      effort: spec.effort,
      recommendationKind: spec.recommendationKind,
    };
  });
}

function runsSuccessMetric(facts: RepoFacts, ownerView: boolean): MetricScore {
  const key = 'ci.runs_success';
  const weight = CI_WEIGHTS.runsSuccess;
  // Полная оценка владельца считает прогоны и у публичного репозитория.
  if (isPublicRepo(facts) && !ownerView) {
    return unknownMetric(key, weight, 'Прогоны CI видны только участникам — в публичный балл не входят');
  }
  const ci = facts.ci;
  if (!ci.available) return unknownMetric(key, weight, 'Прогоны CI не получены');
  const decided = ci.succeeded + ci.failed;
  if (decided === 0) return unknownMetric(key, weight, 'Завершённых прогонов CI нет');
  const share = (ci.succeeded / decided) * 100;
  return {
    key,
    category: CATEGORY,
    weight,
    value: linearScore(share, { min: CI_SUCCESS_WORST, max: CI_SUCCESS_BEST }),
    hint: `Успешных ${ci.succeeded} из ${decided} последних прогонов`,
    target: 100,
    effort: 'medium',
    recommendationKind: 'fix_ci_runs',
  };
}

function unknownMetric(key: string, weight: number, hint: string): MetricScore {
  return { key, category: CATEGORY, weight, value: null, unknown: true, hint };
}
