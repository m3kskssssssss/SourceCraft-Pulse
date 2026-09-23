// Метрики категории «Безопасность».

import type { RepoFacts } from '../../collect';
import {
  CRITICAL_VULNS_MAX,
  HIGH_VULNS_MAX,
  MEDIUM_VULNS_MAX,
  SECURITY_WEIGHTS,
} from '../config';
import { boolScore, invertedLinearScore } from '../normalize';
import type { MetricScore } from '../types';

const CATEGORY = 'security' as const;

/**
 * SECURITY.md здесь больше нет. У обычного проекта его отсутствие не говорит
 * о безопасности ничего, а в списке метрик выглядело обвинением. Факт
 * собирается по-прежнему и уходит провайдеру — просто баллов не отнимает.
 */
export function computeSecurityMetrics(facts: RepoFacts): MetricScore[] {
  return [
    criticalVulnsMetric(facts),
    highVulnsMetric(facts),
    mediumVulnsMetric(facts),
    lockfilesMetric(facts),
    freshDependenciesMetric(facts),
    dependencyBotMetric(facts),
  ];
}

function mediumVulnsMetric(facts: RepoFacts): MetricScore {
  if (!facts.security.available) {
    return {
      key: 'security.medium_vulns',
      category: CATEGORY,
      weight: SECURITY_WEIGHTS.mediumVulns,
      value: null,
      unknown: true,
      hint: 'Провайдер безопасности недоступен',
    };
  }
  const count = facts.security.vulnerabilities.filter((v) => v.severity === 'medium').length;
  return {
    key: 'security.medium_vulns',
    category: CATEGORY,
    weight: SECURITY_WEIGHTS.mediumVulns,
    value: invertedLinearScore(count, { best: 0, worst: MEDIUM_VULNS_MAX }),
    hint: count === 0 ? 'Уязвимостей medium нет' : `Medium: ${count}`,
    target: 100,
    effort: 'medium',
    recommendationKind: 'fix_medium_vulns',
  };
}

/**
 * Бот обновления зависимостей. Разовое обновление стареет через месяц, а
 * dependabot или renovate держат версии свежими без участия человека.
 */
function dependencyBotMetric(facts: RepoFacts): MetricScore {
  const has = facts.tree.flags.hasDependencyBot;
  return {
    key: 'security.dependency_bot',
    category: CATEGORY,
    weight: SECURITY_WEIGHTS.dependencyBot,
    value: boolScore(has),
    hint: has ? 'Автообновление зависимостей настроено' : 'Автообновления зависимостей нет',
    target: 100,
    effort: 'small',
    recommendationKind: 'add_dependency_bot',
  };
}

function criticalVulnsMetric(facts: RepoFacts): MetricScore {
  if (!facts.security.available) {
    return {
      key: 'security.critical_vulns',
      category: CATEGORY,
      weight: SECURITY_WEIGHTS.criticalVulns,
      value: null,
      unknown: true,
      hint: 'Провайдер безопасности недоступен',
    };
  }
  const count = facts.security.vulnerabilities.filter((v) => v.severity === 'critical').length;
  return {
    key: 'security.critical_vulns',
    category: CATEGORY,
    weight: SECURITY_WEIGHTS.criticalVulns,
    value: invertedLinearScore(count, { best: 0, worst: CRITICAL_VULNS_MAX }),
    hint: count === 0 ? 'Критических уязвимостей нет' : `Критических: ${count}`,
    target: 100,
    effort: 'medium',
    recommendationKind: 'fix_critical_vulns',
  };
}

function highVulnsMetric(facts: RepoFacts): MetricScore {
  if (!facts.security.available) {
    return {
      key: 'security.high_vulns',
      category: CATEGORY,
      weight: SECURITY_WEIGHTS.highVulns,
      value: null,
      unknown: true,
      hint: 'Провайдер безопасности недоступен',
    };
  }
  const count = facts.security.vulnerabilities.filter((v) => v.severity === 'high').length;
  return {
    key: 'security.high_vulns',
    category: CATEGORY,
    weight: SECURITY_WEIGHTS.highVulns,
    value: invertedLinearScore(count, { best: 0, worst: HIGH_VULNS_MAX }),
    hint: count === 0 ? 'Уязвимостей high нет' : `High: ${count}`,
    target: 100,
    effort: 'medium',
    recommendationKind: 'fix_high_vulns',
  };
}

function lockfilesMetric(facts: RepoFacts): MetricScore {
  if (facts.security.provider === 'sourcecraft_appsec' && !facts.security.available) {
    // AppSec-заглушка — метрика формально известна: смотрим на дерево напрямую.
  }
  // Смотрим на tree.flags: если lockfiles поддержаны или не поддержаны — важно, что они вообще есть.
  const supported = facts.tree.flags.supportedLockfiles.length > 0;
  const unsupported = facts.tree.flags.unsupportedLockfilesPresent.length > 0;
  const anyPresent = supported || unsupported;
  return {
    key: 'security.lockfiles_present',
    category: CATEGORY,
    weight: SECURITY_WEIGHTS.lockfilesPresent,
    value: boolScore(anyPresent),
    hint: anyPresent ? 'lock-файлы обнаружены' : 'lock-файлы отсутствуют',
    target: 100,
    effort: 'trivial',
    recommendationKind: 'add_lockfile',
  };
}

function freshDependenciesMetric(facts: RepoFacts): MetricScore {
  // MVP: если lock-файл есть и провайдер отвечает — считаем, что зависимости
  // «известны». Полноценная свежесть требует опроса реестра пакетов —
  // отложено на будущее.
  if (!facts.security.available) {
    return {
      key: 'security.fresh_dependencies',
      category: CATEGORY,
      weight: SECURITY_WEIGHTS.freshDependencies,
      value: null,
      unknown: true,
      hint: 'Свежесть зависимостей пока не оценивается',
    };
  }
  const hasLock = facts.tree.flags.supportedLockfiles.length > 0;
  if (!hasLock) {
    return {
      key: 'security.fresh_dependencies',
      category: CATEGORY,
      weight: SECURITY_WEIGHTS.freshDependencies,
      value: null,
      unknown: true,
      hint: 'Нет поддержанного lock-файла — нечего оценивать',
    };
  }
  // Пока принимаем как «нормально».
  return {
    key: 'security.fresh_dependencies',
    category: CATEGORY,
    weight: SECURITY_WEIGHTS.freshDependencies,
    value: 70,
    hint: 'Свежесть по heuristic (наличие lock-файла)',
    target: 80,
    effort: 'medium',
    recommendationKind: 'update_dependencies',
  };
}
