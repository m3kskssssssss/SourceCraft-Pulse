// Метрики категории «Документация». Все heuristic.
// На Этапе 4 категория целиком будет заменяться баллом от AI-рубрики,
// если модель доступна. Здесь — детерминированный fallback.

import type { RepoFacts } from '../../collect';
import { DOCS_WEIGHTS, README_MIN_CHARS, README_TARGET_SECTIONS } from '../config';
import { boolScore, clamp } from '../normalize';
import { isUnknown } from '../facts-helpers';
import type { MetricScore } from '../types';

const CATEGORY = 'docs' as const;

export function computeDocsMetrics(facts: RepoFacts): MetricScore[] {
  return [
    readmeMetric(facts),
    licenseMetric(facts),
    contributingMetric(facts),
    changelogMetric(facts),
    usageExamplesMetric(facts),
    docsDirMetric(facts),
    codeOfConductMetric(facts),
    issueTemplateMetric(facts),
    repoDescriptionMetric(facts),
  ];
}

/** Признак из дерева файлов: одинаковая обвязка для метрик ниже. */
function treeFlagMetric(
  facts: RepoFacts,
  spec: {
    key: string;
    weight: number;
    flag: boolean;
    yes: string;
    no: string;
    effort: 'trivial' | 'small' | 'medium' | 'large';
    recommendationKind: string;
  },
): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: spec.key,
      category: CATEGORY,
      weight: spec.weight,
      value: null,
      unknown: true,
      hint: 'Дерево файлов недоступно',
    };
  }
  return {
    key: spec.key,
    category: CATEGORY,
    weight: spec.weight,
    value: boolScore(spec.flag),
    hint: spec.flag ? spec.yes : spec.no,
    target: 100,
    effort: spec.effort,
    recommendationKind: spec.recommendationKind,
  };
}

/** Каталог docs/: документация, которая уже не помещается в README. */
function docsDirMetric(facts: RepoFacts): MetricScore {
  return treeFlagMetric(facts, {
    key: 'docs.docs_dir',
    weight: DOCS_WEIGHTS.docsDir,
    flag: facts.tree.flags.hasDocsDir,
    yes: 'Каталог с документацией есть',
    no: 'Отдельной документации нет',
    effort: 'medium',
    recommendationKind: 'add_docs_dir',
  });
}

function codeOfConductMetric(facts: RepoFacts): MetricScore {
  return treeFlagMetric(facts, {
    key: 'docs.code_of_conduct',
    weight: DOCS_WEIGHTS.codeOfConduct,
    flag: facts.tree.flags.hasCodeOfConduct,
    yes: 'CODE_OF_CONDUCT есть',
    no: 'CODE_OF_CONDUCT отсутствует',
    effort: 'trivial',
    recommendationKind: 'add_code_of_conduct',
  });
}

function issueTemplateMetric(facts: RepoFacts): MetricScore {
  return treeFlagMetric(facts, {
    key: 'docs.issue_template',
    weight: DOCS_WEIGHTS.issueTemplate,
    flag: facts.tree.flags.hasIssueTemplate,
    yes: 'Шаблоны задач и PR есть',
    no: 'Шаблонов задач и PR нет',
    effort: 'trivial',
    recommendationKind: 'add_issue_template',
  });
}

/**
 * Описание репозитория в карточке SourceCraft. Пустое описание — первое, обо
 * что спотыкается любой, кто нашёл проект в поиске.
 */
function repoDescriptionMetric(facts: RepoFacts): MetricScore {
  if (!facts.repository) {
    return {
      key: 'docs.repo_description',
      category: CATEGORY,
      weight: DOCS_WEIGHTS.repoDescription,
      value: null,
      unknown: true,
      hint: 'Карточка репозитория недоступна',
    };
  }
  const text = (facts.repository.description ?? '').trim();
  const has = text.length >= 20;
  return {
    key: 'docs.repo_description',
    category: CATEGORY,
    weight: DOCS_WEIGHTS.repoDescription,
    value: boolScore(has),
    hint: has ? 'Описание репозитория заполнено' : 'Описание репозитория пустое или слишком короткое',
    target: 100,
    effort: 'trivial',
    recommendationKind: 'add_repo_description',
  };
}

/**
 * README-score heuristic: считаем длину и число заголовков.
 *   - Файл есть          → +20
 *   - Длина ≥ README_MIN_CHARS → +30
 *   - Секций ≥ README_TARGET_SECTIONS → +30
 *   - Есть блок Usage/Пример → +20
 * Итого 0..100.
 *
 * Если tree недоступен, метрика unknown; если README не найден в дереве —
 * это подтверждённое отсутствие, метрика = 0 (не unknown).
 */
function readmeMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: 'docs.readme',
      category: CATEGORY,
      weight: DOCS_WEIGHTS.readme,
      value: null,
      unknown: true,
      hint: 'Дерево файлов недоступно',
    };
  }
  if (!facts.tree.flags.hasReadme) {
    return {
      key: 'docs.readme',
      category: CATEGORY,
      weight: DOCS_WEIGHTS.readme,
      value: 0,
      hint: 'README не найден',
      target: 80,
      effort: 'small',
      recommendationKind: 'add_readme',
    };
  }
  const text = facts.readme ?? '';
  let value = 20; // сам факт наличия README
  if (text.length >= README_MIN_CHARS) value += 30;
  const sectionCount = countMarkdownSections(text);
  if (sectionCount >= README_TARGET_SECTIONS) value += 30;
  if (containsUsageBlock(text)) value += 20;
  return {
    key: 'docs.readme',
    category: CATEGORY,
    weight: DOCS_WEIGHTS.readme,
    value: clamp(value),
    hint: `README: ${text.length} симв., ${sectionCount} секций`,
    target: 80,
    effort: 'small',
    recommendationKind: 'expand_readme',
  };
}

function licenseMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: 'docs.license',
      category: CATEGORY,
      weight: DOCS_WEIGHTS.license,
      value: null,
      unknown: true,
      hint: 'Дерево файлов недоступно',
    };
  }
  const has = facts.tree.flags.hasLicense;
  return {
    key: 'docs.license',
    category: CATEGORY,
    weight: DOCS_WEIGHTS.license,
    value: boolScore(has),
    hint: has ? 'LICENSE есть' : 'LICENSE отсутствует',
    target: 100,
    effort: 'trivial',
    recommendationKind: 'add_license',
  };
}

function contributingMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: 'docs.contributing',
      category: CATEGORY,
      weight: DOCS_WEIGHTS.contributing,
      value: null,
      unknown: true,
      hint: 'Дерево файлов недоступно',
    };
  }
  const has = facts.tree.flags.hasContributing;
  return {
    key: 'docs.contributing',
    category: CATEGORY,
    weight: DOCS_WEIGHTS.contributing,
    value: boolScore(has),
    hint: has ? 'CONTRIBUTING есть' : 'CONTRIBUTING отсутствует',
    target: 100,
    effort: 'trivial',
    recommendationKind: 'add_contributing',
  };
}

function changelogMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: 'docs.changelog',
      category: CATEGORY,
      weight: DOCS_WEIGHTS.changelog,
      value: null,
      unknown: true,
      hint: 'Дерево файлов недоступно',
    };
  }
  const has = facts.tree.flags.hasChangelog;
  return {
    key: 'docs.changelog',
    category: CATEGORY,
    weight: DOCS_WEIGHTS.changelog,
    value: boolScore(has),
    hint: has ? 'CHANGELOG есть' : 'CHANGELOG отсутствует',
    target: 100,
    effort: 'small',
    recommendationKind: 'add_changelog',
  };
}

function usageExamplesMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: 'docs.usage_examples',
      category: CATEGORY,
      weight: DOCS_WEIGHTS.usageExamples,
      value: null,
      unknown: true,
      hint: 'Дерево файлов недоступно',
    };
  }
  // «Есть примеры» = либо директория examples/, либо в README есть блок Usage/Example.
  const hasExamplesDir = facts.tree.entries.some((e) => {
    const p = (e as { path?: string; name?: string }).path ?? (e as { name?: string }).name ?? '';
    return p.toLowerCase().startsWith('examples/') || p.toLowerCase().startsWith('example/');
  });
  const hasUsage = containsUsageBlock(facts.readme ?? '');
  const value = boolScore(hasExamplesDir || hasUsage);
  return {
    key: 'docs.usage_examples',
    category: CATEGORY,
    weight: DOCS_WEIGHTS.usageExamples,
    value,
    hint: value === 100 ? 'Примеры использования найдены' : 'Примеров использования нет',
    target: 100,
    effort: 'small',
    recommendationKind: 'add_usage_examples',
  };
}

// ---------- helpers ----------

function countMarkdownSections(text: string): number {
  if (!text) return 0;
  let count = 0;
  for (const line of text.split('\n')) {
    if (/^#{1,3}\s+\S/.test(line)) count += 1;
  }
  return count;
}

function containsUsageBlock(text: string): boolean {
  if (!text) return false;
  return /\b(usage|examples?|getting started|быстрый старт|использование|примеры)\b/i.test(text);
}
