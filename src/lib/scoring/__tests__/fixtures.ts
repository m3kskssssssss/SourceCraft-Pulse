// Фабрики RepoFacts для тестов движка оценки. Только для тестов.
// Ссылки на схемы SourceCraft приведены к минимально необходимым полям.

import type { RepoFacts } from '../../collect';
import { emptyCodeFacts } from '../../git/code-facts';
import { emptyGitGraph } from '../../git/graph';

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
        hasBuildManifest: false,
        hasGitignore: false,
        hasEditorConfig: false,
        hasCodeOfConduct: false,
        hasIssueTemplate: false,
        hasDependencyBot: false,
        hasDocsDir: false,
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
    // По умолчанию исходники не прочитаны: метрики по коду уходят в unknown,
    // а тесты считаются по галочке из дерева файлов.
    code: emptyCodeFacts(['code_files_not_found']),
    // Дерево коммитов на оценку не влияет — это иллюстрация на странице анализа.
    gitGraph: emptyGitGraph(),
    kind: { kind: 'project', confidence: 1, signals: ['фикстура'] },
    security: {
      provider: 'osv_dev',
      available: true,
      vulnerabilities: [],
      totalScanned: 0,
      errors: [],
      missing: [],
    },
    ci: {
      available: false,
      reason: 'no_owner_token',
      sampled: 0,
      succeeded: 0,
      failed: 0,
      other: 0,
      lastRunAt: null,
      lastStatus: null,
    },
    readme: null,
    missing: [],
  };
  return { ...base, ...overrides };
}

/** «Идеальный» репо — все известные метрики должны выходить в 100. */
export function makePerfectFacts(): RepoFacts {
  const facts = baseFacts({
    // Метрики активности смотрят и сюда: релизы, поток PR, закрытые задачи.
    repository: { description: 'Полноценное описание репозитория для карточки' } as never,
    counters: { forks: 12, pullRequests: 24, issues: 10, tags: 4, branches: 3 },
    tags: [{ name: 'v1.0.0' }, { name: 'v1.1.0' }, { name: 'v2.0.0' }] as never[],
    releases: [{ tag: 'v2.0.0' }] as never[],
    issues: [
      { id: '1', completed_at: '2026-01-01T00:00:00Z' },
      { id: '2', completed_at: '2026-02-01T00:00:00Z' },
      { id: '3', completed_at: '2026-03-01T00:00:00Z' },
      { id: '4' },
    ] as never[],
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
        hasBuildManifest: true,
        hasGitignore: true,
        hasEditorConfig: true,
        hasCodeOfConduct: true,
        hasIssueTemplate: true,
        hasDependencyBot: true,
        hasDocsDir: true,
        supportedLockfiles: ['package-lock.json'],
        unsupportedLockfilesPresent: [],
      },
    },
    code: {
      available: true,
      sourceFiles: 40,
      testFiles: 12,
      testsPer100SourceFiles: 30,
      totalLines: 4_000,
      medianFileLines: 120,
      longFileSharePercent: 0,
      commentSharePercent: 15,
      todoPerKiloLines: 0,
      scannedFiles: 40,
      sampleSource: 'size',
      directories: [],
      sample: [],
      errors: [],
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
    // Вся активность без данных: истории нет, и списки из API тоже не пришли.
    counters: { forks: null, pullRequests: null, issues: null, tags: null, branches: null },
    releases: [],
    tags: [],
    issues: [],
    missing: [
      ...facts.missing,
      'git_clone_failed:mock',
      'security_provider_down',
      'releases_fetch_failed',
      'tags_fetch_failed',
      'pull_requests_fetch_failed',
      'issues_fetch_failed',
    ],
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

/** Идеальный по процессам репозиторий, но сам код плох: категория «Код» проседает. */
export function makeWeakCodeFacts(): RepoFacts {
  const facts = makePerfectFacts();
  return {
    ...facts,
    code: {
      ...facts.code,
      testFiles: 0,
      testsPer100SourceFiles: 0,
      medianFileLines: 640,
      longFileSharePercent: 60,
      commentSharePercent: 1,
      todoPerKiloLines: 12,
    },
  };
}

/** Клон не получился: код оценивать не по чему. */
export function makeNoCloneFacts(): RepoFacts {
  const facts = makePerfectFacts();
  return {
    ...facts,
    code: emptyCodeFacts(['code_files_unreadable']),
    missing: [...facts.missing, 'git_clone_failed:mock'],
  };
}
