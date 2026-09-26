// Метрики категории «Безопасность».
//
// По ТЗ категория считается только по данным SourceCraft AppSec: открытые
// находки SAST, SCA и поиска секретов. Собственных проверок здесь нет — ни
// OSV.dev, ни поиска ключей регулярками: выдавать их за security-сканирование
// ТЗ запрещает. Lock-файл и бот обновлений — гигиена сборки, они в «Коде».
//
// AppSec отдаёт результаты только участникам репозитория, поэтому данные есть
// лишь у приватного репозитория, оценённого токеном владельца. У остальных вся
// категория «нет данных» и выпадает из итогового балла.

import type { RepoFacts } from '../../collect';
import type { Vulnerability } from '../../security/types';
import {
  CRITICAL_VULNS_MAX,
  HIGH_VULNS_MAX,
  MEDIUM_VULNS_MAX,
  SECURITY_WEIGHTS,
} from '../config';
import { boolScore, invertedLinearScore } from '../normalize';
import type { MetricScore } from '../types';

const CATEGORY = 'security' as const;

export const APPSEC_UNAVAILABLE_HINT = 'Нет данных SourceCraft AppSec';

export function computeSecurityMetrics(facts: RepoFacts): MetricScore[] {
  if (!hasAppSecData(facts)) return appSecUnavailableMetrics();
  const findings = facts.security.vulnerabilities;
  return [
    severityMetric(findings, 'critical', {
      key: 'security.critical_vulns',
      weight: SECURITY_WEIGHTS.criticalVulns,
      worst: CRITICAL_VULNS_MAX,
      none: 'Открытых critical-находок нет',
      some: 'Открытых critical-находок',
      recommendationKind: 'fix_critical_vulns',
    }),
    severityMetric(findings, 'high', {
      key: 'security.high_vulns',
      weight: SECURITY_WEIGHTS.highVulns,
      worst: HIGH_VULNS_MAX,
      none: 'Открытых high-находок нет',
      some: 'Открытых high-находок',
      recommendationKind: 'fix_high_vulns',
    }),
    severityMetric(findings, 'medium', {
      key: 'security.medium_vulns',
      weight: SECURITY_WEIGHTS.mediumVulns,
      worst: MEDIUM_VULNS_MAX,
      none: 'Открытых medium-находок нет',
      some: 'Открытых medium-находок',
      recommendationKind: 'fix_medium_vulns',
    }),
    secretsMetric(findings),
  ];
}

export function hasAppSecData(facts: RepoFacts): boolean {
  return facts.security.provider === 'sourcecraft_appsec' && facts.security.available;
}

/** Открытые секреты по данным AppSec. */
export function appSecSecrets(facts: RepoFacts): Vulnerability[] {
  if (!hasAppSecData(facts)) return [];
  return facts.security.vulnerabilities.filter((v) => v.kind === 'secret');
}

function appSecUnavailableMetrics(): MetricScore[] {
  const weights: Array<[string, number]> = [
    ['security.critical_vulns', SECURITY_WEIGHTS.criticalVulns],
    ['security.high_vulns', SECURITY_WEIGHTS.highVulns],
    ['security.medium_vulns', SECURITY_WEIGHTS.mediumVulns],
    ['security.secrets', SECURITY_WEIGHTS.secrets],
  ];
  return weights.map(([key, weight]) => ({
    key,
    category: CATEGORY,
    weight,
    value: null,
    unknown: true,
    hint: APPSEC_UNAVAILABLE_HINT,
  }));
}

function severityMetric(
  findings: Vulnerability[],
  severity: Vulnerability['severity'],
  spec: {
    key: string;
    weight: number;
    worst: number;
    none: string;
    some: string;
    recommendationKind: string;
  },
): MetricScore {
  const count = findings.filter((v) => v.severity === severity).length;
  return {
    key: spec.key,
    category: CATEGORY,
    weight: spec.weight,
    value: invertedLinearScore(count, { best: 0, worst: spec.worst }),
    hint: count === 0 ? spec.none : `${spec.some}: ${count}`,
    target: 100,
    effort: 'medium',
    recommendationKind: spec.recommendationKind,
  };
}

/** Секрет в репозитории — ноль баллов сразу: ключ уже доступен всем, у кого есть клон. */
function secretsMetric(findings: Vulnerability[]): MetricScore {
  const count = findings.filter((v) => v.kind === 'secret').length;
  return {
    key: 'security.secrets',
    category: CATEGORY,
    weight: SECURITY_WEIGHTS.secrets,
    value: boolScore(count === 0),
    hint: count === 0 ? 'Открытых секретов нет' : `Открытых секретов: ${count}`,
    target: 100,
    effort: 'small',
    recommendationKind: 'remove_secrets',
  };
}
