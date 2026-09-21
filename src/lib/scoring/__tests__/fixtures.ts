// Фабрики RepoFacts для тестов движка оценки. Только для тестов.
// Ссылки на схемы SourceCraft приведены к минимально необходимым полям.

import type { RepoFacts } from '../../collect';

/** Базовый «пустой но полностью известный» RepoFacts. */
function baseFacts(overrides: Partial<RepoFacts> = {}): RepoFacts {
  const base: RepoFacts = {
    org: 'test-org',
    repo: 'test-repo',
    collectedAt: '2026-09-20T00:00:00.000Z',
    repository: null,
    counters: { forks: 0, pullRequests: 0, issues: 0, tags: 0, branches: 0 },
    language: null,
    languages: [],
    defaultBranch: 'main',
    cloneUrl: { https: 'https://example.test/x.git', ssh: null },
    webUrl: null,
    contributors: [],
    tree: {
      entriesCount: 0,
      entries: [],
      flags: {
        hasReadme: false,
        hasLicense: false,
        hasContributing: false,
        hasSecurityMd: false,
        hasChangelog: false,
        hasCiConfig: false,
        hasTestsDir: false,
        hasLinterConfig: false,
        supportedLockfiles: [],
        unsupportedLockfilesPresent: [],
      },
    },
    branches: [],
    tags: [],
    releases: [],
    latestRelease: null,
    pullRequests: [],
    issues: [],
    gitHistory: {
      available: true,
      commitsLast90Days: 0,
      uniqueAuthorsLast90Days: 0,
      lastCommitDate: null,
      topAuthorSharePercent: null,
      secretHits: [],
      secretsScannedFiles: 0,
      errors: [],
    },
    security: {
      provider: 'osv_dev',
      available: true,
      vulnerabilities: [],
      totalScanned: 0,
      errors: [],
      missing: [],
    },
    readme: null,
    missing: [],
  };
  return { ...base, ...overrides };
}

/** «Идеальный» репо — все известные метрики должны выходить в 100. */
export function makePerfectFacts(): RepoFacts {
  const facts = baseFacts({
    tree: {
      entriesCount: 20,
      entries: [
        { path: 'README.md' } as never,
        { path: 'LICENSE' } as never,
        { path: 'CONTRIBUTING.md' } as never,
        { path: 'SECURITY.md' } as never,
        { path: 'CHANGELOG.md' } as never,
        { path: 'package-lock.json' } as never,
        { path: 'tests/foo.test.ts' } as never,
        { path: 'eslint.config.mjs' } as never,
        { path: '.sourcecraft/ci.yaml' } as never,
        { path: 'examples/quickstart.md' } as never,
      ],
      flags: {
        hasReadme: true,
        hasLicense: true,
        hasContributing: true,
        hasSecurityMd: true,
        hasChangelog: true,
        hasCiConfig: true,
        hasTestsDir: true,
        hasLinterConfig: true,
        supportedLockfiles: ['package-lock.json'],
        unsupportedLockfilesPresent: [],
      },
    },
    gitHistory: {
      available: true,
      commitsLast90Days: 200,
      uniqueAuthorsLast90Days: 8,
      lastCommitDate: new Date().toISOString(),
      topAuthorSharePercent: 25,
      secretHits: [],
      secretsScannedFiles: 0,
      errors: [],
    },
    readme: [
      '# Awesome Project',
      '',
      'Полноценное описание проекта на несколько абзацев, чтобы точно перевалить',
      'за пороговую длину. ' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10),
      '',
      '## Установка',
      'npm install awesome-project',
      '',
      '## Использование',
      '```js',
      "import x from 'awesome-project';",
      '```',
      '',
      '## Contributing',
      'PRs welcome.',
      '',
      '## License',
      'MIT.',
    ].join('\n'),
  });
  return facts;
}

/**
 * «Пустой» репо: данные известны (мы всё запросили и знаем, что ничего нет).
 * Ожидаемый score близок к нулю.
 */
export function makeEmptyFacts(): RepoFacts {
  return baseFacts();
}

/**
 * Часть категорий помечена как unknown через facts.missing. Ожидаем, что
 * известные категории всё равно дают разумный балл, и overall не падает в 0.
 */
export function makeMissingActivityFacts(): RepoFacts {
  const facts = makePerfectFacts();
  return {
    ...facts,
    gitHistory: {
      ...facts.gitHistory,
      available: false,
      commitsLast90Days: null,
      uniqueAuthorsLast90Days: null,
      lastCommitDate: null,
      topAuthorSharePercent: null,
      errors: ['git_history_failed: mock'],
    },
    security: {
      ...facts.security,
      available: false,
    },
    missing: [...facts.missing, 'git_clone_failed:mock', 'security_provider_down'],
  };
}

/** Идеальный, но с secret и critical CVE — проверяем, что штрафы вычитаются. */
export function makeFactsWithPenalties(): RepoFacts {
  const facts = makePerfectFacts();
  return {
    ...facts,
    gitHistory: {
      ...facts.gitHistory,
      secretHits: [{ name: 'aws_access_key', sample: 'AKIA1234…' }],
    },
    security: {
      ...facts.security,
      vulnerabilities: [
        {
          id: 'GHSA-critical-1',
          severity: 'critical',
          package: 'left-pad',
          version: '1.0.0',
          ecosystem: 'npm',
          summary: null,
          fixedIn: null, // без исправления — включает штраф
        },
      ],
      totalScanned: 1,
    },
    tree: {
      ...facts.tree,
      flags: {
        ...facts.tree.flags,
        hasLicense: false, // ещё один штраф
      },
    },
  };
}
