// Метрики категории «Безопасность».

import type { RepoFacts } from '../../collect';
import {
  CRITICAL_VULNS_MAX,
  HIGH_VULNS_MAX,
  SECURITY_WEIGHTS,
} from '../config';
import { boolScore, invertedLinearScore } from '../normalize';
import type { MetricScore } from '../types';

const CATEGORY = 'security' as const;

export function computeSecurityMetrics(facts: RepoFacts): MetricScore[] {
  return [
    criticalVulnsMetric(facts),
    highVulnsMetric(facts),
    lockfilesMetric(facts),
    securityMdMetric(facts),
    freshDependenciesMetric(facts),
  ];
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

function securityMdMetric(facts: RepoFacts): MetricScore {
  const has = facts.tree.flags.hasSecurityMd;
  return {
    key: 'security.security_md',
    category: CATEGORY,
    weight: SECURITY_WEIGHTS.securityMd,
    value: boolScore(has),
    hint: has ? 'SECURITY.md есть' : 'SECURITY.md отсутствует',
    target: 100,
    effort: 'trivial',
    recommendationKind: 'add_security_md',
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
