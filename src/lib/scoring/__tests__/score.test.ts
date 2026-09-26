import { describe, expect, it } from 'vitest';
import { scoreRepo } from '..';
import { PENALTIES, RECOMMENDATIONS_LIMIT } from '../config';
import type { MetricScore } from '../types';
import {
  makeEmptyFacts,
  makeFactsWithPenalties,
  makeMissingActivityFacts,
  makeNoCloneFacts,
  makePerfectFacts,
  makeWeakCodeFacts,
} from './fixtures';

describe('scoreRepo — идеальный репозиторий', () => {
  const result = scoreRepo(makePerfectFacts());

  it('даёт score ≥ 95', () => {
    expect(result.score).toBeGreaterThanOrEqual(95);
  });

  it('не применяет штрафов', () => {
    expect(result.penalties).toEqual([]);
  });

  it('заполняет все четыре категории known значениями', () => {
    for (const c of result.categoryScores) {
      expect(c.value).not.toBeNull();
    }
  });
});

describe('scoreRepo — пустой репозиторий', () => {
  const facts = makeEmptyFacts();
  const result = scoreRepo(facts);

  it('даёт score ≤ 15 (по факту очень маленький)', () => {
    expect(result.score).toBeLessThanOrEqual(15);
  });

  it('применяет штраф за отсутствие лицензии', () => {
    expect(result.penalties.map((p) => p.key)).toContain('missing_license');
  });
});

describe('scoreRepo — отсутствие данных не роняет в ноль', () => {
  const facts = makeMissingActivityFacts();
  const result = scoreRepo(facts);

  it('score не 0 (три категории с данными всё ещё считаются)', () => {
    expect(result.score).toBeGreaterThan(30);
  });

  it('категория activity полностью unknown', () => {
    const activity = result.categoryScores.find((c) => c.key === 'activity');
    expect(activity?.value).toBeNull();
  });
});

describe('scoreRepo — штрафы', () => {
  const facts = makeFactsWithPenalties();
  const result = scoreRepo(facts);

  it('содержит три штрафа: секрет, critical CVE, нет лицензии', () => {
    const keys = result.penalties.map((p) => p.key).sort();
    expect(keys).toEqual(['critical_vuln_unfixed', 'missing_license', 'secret_in_code']);
  });

  it('итог = round(clamp(scoreBeforePenalties − сумма штрафов))', () => {
    const totalPenalty =
      PENALTIES.secretInCode + PENALTIES.criticalVulnUnfixed + PENALTIES.missingLicense;
    const expected = Math.max(0, Math.round(result.scoreBeforePenalties - totalPenalty));
    expect(result.score).toBe(expected);
  });

  it('score не уходит ниже 0', () => {
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe('scoreRepo — категория «Код»', () => {
  it('плохой код роняет категорию, хотя линтер и CI на месте', () => {
    const code = scoreRepo(makeWeakCodeFacts()).categoryScores.find((c) => c.key === 'code');
    expect(code?.value).not.toBeNull();
    expect(code?.value ?? 100).toBeLessThan(50);
  });

  it('без клона метрики по исходникам уходят в unknown, категория живёт на дереве', () => {
    const code = scoreRepo(makeNoCloneFacts()).categoryScores.find((c) => c.key === 'code');
    const unknownKeys = code!.metrics.filter((m) => m.unknown).map((m) => m.key).sort();
    expect(unknownKeys).toEqual(['code.comments', 'code.file_size', 'code.todo_debt']);
    expect(code?.value).not.toBeNull();
  });

  it('AI-ревью заменяет категорию целиком', () => {
    const result = scoreRepo(makePerfectFacts(), {
      aiCodeScore: { value: 42, summary: 'Выборка так себе' },
    });
    const code = result.categoryScores.find((c) => c.key === 'code');
    expect(code?.value).toBe(42);
    expect(code?.metrics.map((m) => m.key)).toEqual(['code.ai_review']);
  });

  it('AI-ревью не трогает остальные категории', () => {
    const base = scoreRepo(makePerfectFacts());
    const withAi = scoreRepo(makePerfectFacts(), { aiCodeScore: { value: 42 } });
    for (const key of ['activity', 'security', 'docs'] as const) {
      const before = base.categoryScores.find((c) => c.key === key)?.value;
      const after = withAi.categoryScores.find((c) => c.key === key)?.value;
      expect(after).toBe(before);
    }
  });
});

describe('scoreRepo — безопасность только по AppSec', () => {
  const noAppSec = (): ReturnType<typeof makePerfectFacts> => {
    const facts = makePerfectFacts();
    return {
      ...facts,
      security: {
        provider: 'sourcecraft_appsec',
        available: false,
        vulnerabilities: [],
        totalScanned: 0,
        errors: [],
        missing: ['sourcecraft_appsec_not_public'],
      },
    };
  };

  it('без AppSec категория «Безопасность» — нет данных и без рекомендаций', () => {
    const result = scoreRepo(noAppSec());
    const security = result.categoryScores.find((c) => c.key === 'security');
    expect(security?.value).toBeNull();
    expect(security?.metrics.every((m) => m.unknown)).toBe(true);
    expect(result.recommendations.some((r) => r.category === 'security')).toBe(false);
  });

  it('справка OSV.dev не влияет ни на балл, ни на штрафы', () => {
    const base = scoreRepo(noAppSec());
    const withOsv = scoreRepo({
      ...noAppSec(),
      dependencyAudit: {
        provider: 'osv_dev',
        available: true,
        vulnerabilities: [
          {
            id: 'GHSA-critical-1',
            severity: 'critical',
            package: 'left-pad',
            version: '1.0.0',
            ecosystem: 'npm',
            summary: null,
            fixedIn: null,
          },
        ],
        totalScanned: 1,
        errors: [],
        missing: [],
      },
    });
    expect(withOsv.score).toBe(base.score);
    expect(withOsv.penalties).toEqual(base.penalties);
  });

  it('старые факты, где OSV был провайдером балла, тоже не считаются', () => {
    const facts = makePerfectFacts();
    const result = scoreRepo({ ...facts, security: { ...facts.security, provider: 'osv_dev' } });
    expect(result.categoryScores.find((c) => c.key === 'security')?.value).toBeNull();
  });
});

describe('scoreRepo — рекомендации', () => {
  it('пустой репо получает полный список', () => {
    const result = scoreRepo(makeEmptyFacts());
    expect(result.recommendations.length).toBe(RECOMMENDATIONS_LIMIT);
  });

  it('сумма gain совпадает с приростом score при их применении', () => {
    const facts = makeEmptyFacts();
    const base = scoreRepo(facts);
    // «Применяем» рекомендации: подкручиваем соответствующие поля в facts до целей.
    const applied = applyRecommendationsToFacts(facts, base.recommendations.map((r) => r.key));
    const after = scoreRepo(applied);
    const sumGain = base.recommendations.reduce((sum, r) => sum + r.gain, 0);
    // Допускаем расхождение в 1 балл: каждый прирост округляется отдельно.
    expect(Math.abs(after.score - base.score - sumGain)).toBeLessThanOrEqual(1);
  });

  // Ради этого приросты и считаются по очереди: независимые приросты от одной
  // базы складывались в обещание набрать больше сотни.
  it('балл плюс сумма приростов не превышает 100', () => {
    for (const facts of [makeEmptyFacts(), makeWeakCodeFacts(), makeNoCloneFacts()]) {
      const result = scoreRepo(facts);
      const sumGain = result.recommendations.reduce((sum, r) => sum + r.gain, 0);
      expect(result.score + sumGain).toBeLessThanOrEqual(100);
    }
  });

  it('идеальный репо получает 0 рекомендаций', () => {
    const result = scoreRepo(makePerfectFacts());
    expect(result.recommendations.length).toBe(0);
  });
});

// ---------- helpers ----------

/** Ставит указанные метрики на target в fixtures — только для теста sum-of-gains. */
function applyRecommendationsToFacts(
  facts: ReturnType<typeof makeEmptyFacts>,
  metricKeys: string[],
): ReturnType<typeof makeEmptyFacts> {
  const flags = { ...facts.tree.flags };
  let gh = { ...facts.gitHistory };
  let security = { ...facts.security };
  let readme = facts.readme;
  let repository = facts.repository;
  let tags = facts.tags;
  let issues = facts.issues;
  let counters = { ...facts.counters };
  const entries = [...facts.tree.entries];

  for (const key of metricKeys) {
    switch (key) {
      case 'docs.license':
        flags.hasLicense = true;
        break;
      case 'docs.readme':
        flags.hasReadme = true;
        readme =
          '# Проект\n\n## Установка\n\n## Использование\n\n## Contributing\n\n' +
          'Достаточно длинное описание, ' + 'бла '.repeat(200);
        break;
      case 'docs.contributing':
        flags.hasContributing = true;
        break;
      case 'docs.changelog':
        flags.hasChangelog = true;
        break;
      case 'docs.usage_examples':
        entries.push({ path: 'examples/quickstart.md' } as never);
        break;
      case 'code.tests':
        flags.hasTestsDir = true;
        entries.push({ path: 'tests/foo.test.ts' } as never);
        break;
      case 'code.has_ci':
        flags.hasCiConfig = true;
        entries.push({ path: '.sourcecraft/ci.yaml' } as never);
        break;
      case 'code.has_linter':
        flags.hasLinterConfig = true;
        entries.push({ path: 'eslint.config.mjs' } as never);
        break;
      case 'security.dependency_bot':
        flags.hasDependencyBot = true;
        entries.push({ path: '.github/dependabot.yml' } as never);
        break;
      case 'security.medium_vulns':
        security = {
          ...security,
          vulnerabilities: security.vulnerabilities.filter((v) => v.severity !== 'medium'),
        };
        break;
      case 'code.build_manifest':
        flags.hasBuildManifest = true;
        entries.push({ path: 'package.json' } as never);
        break;
      case 'code.gitignore':
        flags.hasGitignore = true;
        entries.push({ path: '.gitignore' } as never);
        break;
      case 'code.editorconfig':
        flags.hasEditorConfig = true;
        entries.push({ path: '.editorconfig' } as never);
        break;
      case 'docs.docs_dir':
        flags.hasDocsDir = true;
        entries.push({ path: 'docs/index.md' } as never);
        break;
      case 'docs.code_of_conduct':
        flags.hasCodeOfConduct = true;
        entries.push({ path: 'CODE_OF_CONDUCT.md' } as never);
        break;
      case 'docs.issue_template':
        flags.hasIssueTemplate = true;
        entries.push({ path: '.github/issue_template.md' } as never);
        break;
      case 'docs.repo_description':
        repository = { description: 'Понятное описание репозитория в карточке' } as never;
        break;
      case 'activity.releases':
        tags = [{ name: 'v1.0.0' }, { name: 'v1.1.0' }, { name: 'v2.0.0' }] as never[];
        break;
      case 'activity.pr_flow':
        counters = { ...counters, pullRequests: 12 };
        break;
      case 'activity.issue_flow':
        issues = [
          { id: '1', completed_at: '2026-01-01T00:00:00Z' },
          { id: '2', completed_at: '2026-02-01T00:00:00Z' },
        ] as never[];
        break;
      case 'security.lockfiles_present':
        flags.supportedLockfiles = ['package-lock.json'];
        entries.push({ path: 'package-lock.json' } as never);
        break;
      case 'security.critical_vulns':
        security = { ...security, vulnerabilities: [] };
        break;
      case 'security.high_vulns':
        security = { ...security, vulnerabilities: security.vulnerabilities.filter((v) => v.severity !== 'high') };
        break;
      case 'security.fresh_dependencies':
        // heuristic-метрика: если lock уже был — value 70 → ставим 80 через lockfile bump
        break;
      case 'activity.commits_90d':
        gh = { ...gh, commitsLast90Days: 60 };
        break;
      case 'activity.active_authors':
        gh = { ...gh, uniqueAuthorsLast90Days: 5 };
        break;
      case 'activity.freshness':
        gh = { ...gh, lastCommitDate: new Date().toISOString() };
        break;
      case 'activity.bus_factor':
        gh = { ...gh, topAuthorSharePercent: 25 };
        break;
      default:
        break;
    }
  }

  return {
    ...facts,
    readme,
    repository,
    tags,
    issues,
    counters,
    gitHistory: gh,
    security,
    tree: {
      ...facts.tree,
      entriesCount: entries.length,
      entries,
      flags,
    },
  };
}

// Дополнительный статический тест — что типы метрик компилируются.
const _typecheck: MetricScore | undefined = undefined;
void _typecheck;
