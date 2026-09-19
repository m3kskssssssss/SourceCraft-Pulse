// Сборщик сырых фактов о репозитории. Оценок здесь нет — только данные.
//
// Один заход:
//   1. API SourceCraft: /repos, /contributors, /trees, /branches, /tags, /releases,
//      /releases/latest, /pulls (выборка), /issues (выборка).
//   2. Bare-клон git (один): git log — статистика 90 дней + скан секретов + чтение lock-файлов.
//   3. SecurityProvider (OSV по умолчанию): вход — резолвленные lock-файлы.
//
// Всё, что не удалось получить, честно уходит в `missing: string[]`.

import {
  KNOWN_UNSUPPORTED_LOCKFILES,
  SUPPORTED_LOCKFILES,
  parseLockfiles,
} from './security/lockfiles';
import { getSecurityProvider } from './security/provider';
import type { SecurityScanResult } from './security/types';
import { readFileFromClone, withBareClone } from './git/clone';
import { analyzeGitHistoryInClone, type GitHistoryFacts } from './git/history';
import {
  getSourcecraftClient,
  type Branch,
  type Issue,
  type PullRequest,
  type Release,
  type Repository,
  type Tag,
  type TreeEntry,
  type UserProfile,
} from './sourcecraft/client';
import { SourcecraftApiError, SourcecraftNotFoundError } from './sourcecraft/errors';

// ---------- Формат RepoFacts ----------

export type RepoTreeFlags = {
  hasReadme: boolean;
  hasLicense: boolean;
  hasContributing: boolean;
  hasSecurityMd: boolean;
  hasChangelog: boolean;
  hasCiConfig: boolean; // наличие любого конфига CI (см. CI_CONFIG_MARKERS)
  hasTestsDir: boolean; // наличие директории или файлов с признаками тестов
  hasLinterConfig: boolean; // eslint/biome/prettier
  supportedLockfiles: string[]; // те, что мы умеем парсить и они реально есть
  unsupportedLockfilesPresent: string[]; // lock-файлы, для которых у нас нет парсера
};

export type NormalizedCounters = {
  forks: number | null;
  pullRequests: number | null;
  issues: number | null;
  tags: number | null;
  branches: number | null;
};

export type RepoFacts = {
  org: string;
  repo: string;
  collectedAt: string; // ISO
  repository: Repository | null;
  counters: NormalizedCounters;
  language: string | null;
  defaultBranch: string | null;
  cloneUrl: { https: string | null; ssh: string | null };
  webUrl: string | null;
  contributors: UserProfile[];
  tree: {
    entriesCount: number;
    entries: TreeEntry[];
    flags: RepoTreeFlags;
  };
  branches: Branch[];
  tags: Tag[];
  releases: Release[];
  latestRelease: Release | null;
  pullRequests: PullRequest[];
  issues: Issue[];
  gitHistory: GitHistoryFacts;
  security: SecurityScanResult;
  missing: string[];
};

// ---------- Пороги/лимиты ----------

const PULLS_SAMPLE_LIMIT = 50;
const ISSUES_SAMPLE_LIMIT = 50;
const CONTRIBUTORS_LIMIT = 200;
const TREE_ITEMS_LIMIT = 5000;

const README_NAMES = ['readme.md', 'readme.rst', 'readme.txt', 'readme'];
const LICENSE_NAMES = ['license', 'license.md', 'license.txt', 'copying'];
const CONTRIBUTING_NAMES = ['contributing.md', 'contributing.txt', 'contributing'];
const SECURITY_NAMES = ['security.md', 'security.rst', 'security'];
const CHANGELOG_NAMES = ['changelog.md', 'changelog.rst', 'changelog', 'history.md'];
const LINTER_MARKERS = [
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.ts',
  'biome.json',
  'biome.jsonc',
  '.prettierrc',
  'prettier.config.js',
  'ruff.toml',
  '.rubocop.yml',
];
const CI_CONFIG_MARKERS = [
  '.sourcecraft/ci.yaml',
  '.sourcecraft/ci.yml',
  '.github/workflows',
  '.gitlab-ci.yml',
  '.circleci/config.yml',
  'azure-pipelines.yml',
  'Jenkinsfile',
];
const TESTS_MARKERS = ['tests/', 'test/', '__tests__/', 'spec/', '.test.', '.spec.'];

// ---------- Точка входа ----------

export type CollectOptions = {
  /** Разрешить попытку git clone. По умолчанию true. */
  runGitAnalysis?: boolean;
  /** Максимум PR-ов, которые семплируем. */
  pullsSampleLimit?: number;
  /** Максимум issue-ов, которые семплируем. */
  issuesSampleLimit?: number;
};

export async function collectRepoFacts(
  org: string,
  repo: string,
  options: CollectOptions = {},
): Promise<RepoFacts> {
  const missing: string[] = [];
  const client = getSourcecraftClient();
  const security = getSecurityProvider();

  const now = new Date().toISOString();

  // 1. Карточка репозитория
  let repository: Repository | null = null;
  try {
    repository = await client.getRepository(org, repo);
  } catch (err) {
    if (err instanceof SourcecraftNotFoundError) {
      missing.push('repository_not_found_or_forbidden');
    } else if (err instanceof SourcecraftApiError) {
      missing.push(`repository_api_error:${err.status}`);
    } else {
      missing.push('repository_fetch_failed');
    }
  }

  const counters = normalizeCounters(repository);
  const cloneUrlHttps = repository?.clone_url?.https ?? null;
  const cloneUrlSsh = repository?.clone_url?.ssh ?? null;

  // 2. Всё, что не зависит от clone, — параллельно
  const [contributors, treeEntries, branches, tags, releases, latestRelease, pullRequests, issues] =
    await Promise.all([
      safe(
        () => client.collect((p) => client.listContributors(org, repo, p), 'contributors', CONTRIBUTORS_LIMIT),
        missing,
        'contributors_fetch_failed',
        [] as UserProfile[],
      ),
      safe(
        () => client.collect((p) => client.listTree(org, repo, { ...p, recursive: true }), 'trees', TREE_ITEMS_LIMIT),
        missing,
        'tree_fetch_failed',
        [] as TreeEntry[],
      ),
      safe(
        () => client.collect((p) => client.listBranches(org, repo, p), 'branches', 500),
        missing,
        'branches_fetch_failed',
        [] as Branch[],
      ),
      safe(
        () => client.collect((p) => client.listTags(org, repo, p), 'tags', 500),
        missing,
        'tags_fetch_failed',
        [] as Tag[],
      ),
      safe(
        () => client.collect((p) => client.listReleases(org, repo, p), 'releases', 100),
        missing,
        'releases_fetch_failed',
        [] as Release[],
      ),
      safe(
        () => client.getLatestRelease(org, repo),
        missing,
        'latest_release_fetch_failed',
        null as Release | null,
      ),
      safe(
        () =>
          client.collect(
            (p) => client.listPullRequests(org, repo, p),
            'pull_requests',
            options.pullsSampleLimit ?? PULLS_SAMPLE_LIMIT,
          ),
        missing,
        'pull_requests_fetch_failed',
        [] as PullRequest[],
      ),
      safe(
        () =>
          client.collect(
            (p) => client.listIssues(org, repo, p),
            'issues',
            options.issuesSampleLimit ?? ISSUES_SAMPLE_LIMIT,
          ),
        missing,
        'issues_fetch_failed',
        [] as Issue[],
      ),
    ]);

  const flags = computeTreeFlags(treeEntries);
  if (!flags.hasReadme) missing.push('readme_missing');
  if (!flags.hasLicense) missing.push('license_missing');

  // 3. git clone + история + чтение lock-файлов + security scan
  let gitHistory: GitHistoryFacts = {
    available: false,
    commitsLast90Days: null,
    uniqueAuthorsLast90Days: null,
    lastCommitDate: null,
    topAuthorSharePercent: null,
    totalCommits: null,
    secretHits: [],
    secretsScanCommitLimit: 500,
    errors: [],
  };
  let lockfileContents: { packageLockJson?: string; pnpmLockYaml?: string } = {};

  if ((options.runGitAnalysis ?? true) && cloneUrlHttps) {
    try {
      await withBareClone(
        { cloneUrlHttps, token: process.env.SOURCECRAFT_PAT ?? undefined },
        async (workDir) => {
          const [history, packageLockJson, pnpmLockYaml] = await Promise.all([
            analyzeGitHistoryInClone(workDir),
            readFileFromClone(workDir, 'HEAD:package-lock.json'),
            readFileFromClone(workDir, 'HEAD:pnpm-lock.yaml'),
          ]);
          gitHistory = history;
          lockfileContents = {
            packageLockJson: packageLockJson ?? undefined,
            pnpmLockYaml: pnpmLockYaml ?? undefined,
          };
        },
      );
    } catch (err) {
      missing.push(`git_clone_failed:${describe(err)}`);
    }
  } else if (!cloneUrlHttps) {
    missing.push('clone_url_missing');
  }

  // 4. security scan
  const parsedLocks = parseLockfiles({
    packageLockJson: lockfileContents.packageLockJson,
    pnpmLockYaml: lockfileContents.pnpmLockYaml,
    unsupportedFound: flags.unsupportedLockfilesPresent,
  });
  for (const e of parsedLocks.errors) missing.push(`lockfile_parse_error:${e}`);

  const scanResult = await security.scan({
    dependencies: parsedLocks.dependencies,
    hasSecurityMd: flags.hasSecurityMd,
    unsupportedLockfiles: parsedLocks.unsupported,
  });
  for (const e of scanResult.errors) missing.push(`security_scan_error:${e}`);
  for (const e of scanResult.missing) missing.push(e);

  return {
    org,
    repo,
    collectedAt: now,
    repository,
    counters,
    language: repository?.language?.name ?? null,
    defaultBranch: repository?.default_branch ?? null,
    cloneUrl: { https: cloneUrlHttps, ssh: cloneUrlSsh },
    webUrl: repository?.web_url ?? null,
    contributors,
    tree: {
      entriesCount: treeEntries.length,
      entries: treeEntries,
      flags,
    },
    branches,
    tags,
    releases,
    latestRelease,
    pullRequests,
    issues,
    gitHistory,
    security: scanResult,
    missing: dedupeStrings(missing),
  };
}

// ---------- helpers ----------

function normalizeCounters(repo: Repository | null): NormalizedCounters {
  const c = repo?.counters;
  const num = (v: string | undefined): number | null => {
    if (v === undefined) return null;
    const parsed = Number.parseInt(v, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    forks: num(c?.forks),
    pullRequests: num(c?.pull_requests),
    issues: num(c?.issues),
    tags: num(c?.tags),
    branches: num(c?.branches),
  };
}

function computeTreeFlags(entries: TreeEntry[]): RepoTreeFlags {
  const paths = entries.map((e) => normalizePath(e));
  const lowerPaths = paths.map((p) => p.toLowerCase());

  const has = (targets: string[]): boolean =>
    lowerPaths.some((p) => targets.some((t) => p === t || p.endsWith('/' + t)));

  const hasReadme = has(README_NAMES);
  const hasLicense = has(LICENSE_NAMES);
  const hasContributing = has(CONTRIBUTING_NAMES);
  const hasSecurityMd = has(SECURITY_NAMES);
  const hasChangelog = has(CHANGELOG_NAMES);

  const hasCiConfig = lowerPaths.some((p) =>
    CI_CONFIG_MARKERS.some((m) => p === m.toLowerCase() || p.startsWith(m.toLowerCase())),
  );
  const hasLinterConfig = lowerPaths.some((p) =>
    LINTER_MARKERS.some((m) => p === m.toLowerCase() || p.endsWith('/' + m.toLowerCase())),
  );
  const hasTestsDir = lowerPaths.some((p) => TESTS_MARKERS.some((m) => p.includes(m.toLowerCase())));

  const supportedLockfiles = SUPPORTED_LOCKFILES.filter((n) => lowerPaths.includes(n.toLowerCase()));
  const unsupportedLockfilesPresent = KNOWN_UNSUPPORTED_LOCKFILES.filter((n) =>
    lowerPaths.includes(n.toLowerCase()),
  );

  return {
    hasReadme,
    hasLicense,
    hasContributing,
    hasSecurityMd,
    hasChangelog,
    hasCiConfig,
    hasTestsDir,
    hasLinterConfig,
    supportedLockfiles: [...supportedLockfiles],
    unsupportedLockfilesPresent: [...unsupportedLockfilesPresent],
  };
}

function normalizePath(entry: TreeEntry): string {
  const raw = (entry as { path?: string; name?: string }).path ?? (entry as { name?: string }).name ?? '';
  return raw;
}

async function safe<T>(
  fn: () => Promise<T>,
  missing: string[],
  errorTag: string,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    missing.push(`${errorTag}:${describe(err).slice(0, 200)}`);
    return fallback;
  }
}

function dedupeStrings(items: string[]): string[] {
  return Array.from(new Set(items));
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
