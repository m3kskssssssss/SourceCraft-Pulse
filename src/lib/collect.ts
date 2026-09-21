// Сборщик сырых фактов о репозитории. Оценок здесь нет — только данные.
//
// Один заход:
//   1. API SourceCraft: /repos, /contributors, /trees, /branches, /tags, /releases,
//      /releases/latest, /pulls (выборка), /issues (выборка).
//   2. Клон репозитория (один): индекс файлов строится одним обходом дерева,
//      лог коммитов читается один раз на историю и на дерево пути, файлы
//      читаются пачками и по общему дедлайну.
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
import { deepenClone, openIndexedClone, readFilesFromClone, withRepoClone } from './git/clone';
import {
  analyzeGitHistoryInClone,
  emptyGitHistoryFacts,
  type GitHistoryFacts,
} from './git/history';
import { detectLanguages, type LanguageShare } from './git/languages';
import {
  collectCodeFacts,
  emptyCodeFacts,
  type CodeCatalogEntry,
  type CodeFacts,
} from './git/code-facts';
import { readCloneCommits, type RawCommit } from './git/commits';
import { collectGitGraph, emptyGitGraph, type GitGraph } from './git/graph';
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
  /** Основной язык: из API, а если там пусто — самый частый по файлам клона. */
  language: string | null;
  /** Раскладка по языкам по составу файлов. */
  languages: LanguageShare[];
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
  /** Путь создания: коммиты, ветвления и слияния для дерева. */
  gitGraph: GitGraph;
  /** Измерения по самим исходникам. */
  code: CodeFacts;
  security: SecurityScanResult;
  /** Полный текст README.md (если найден в git-клоне). */
  readme: string | null;
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
/** Сколько коммитов читаем из клона: хватает и метрикам, и дереву. */
const COMMIT_LIMIT = 2_000;
/** Меньше этого остатка за добор истории даже не беремся. */
const DEEPEN_MIN_LEFT_MS = 20_000;
/** И дольше этого его не ждём: не добрался за полминуты — не доберётся. */
const DEEPEN_MAX_MS = 30_000;
/**
 * Добираем историю только у небольших репозиториев. У крупного и пачка тяжёлая,
 * и дерево всё равно рисуется по последним двум с половиной сотням коммитов —
 * платить за это минутой ожидания нечем.
 */
const DEEPEN_MAX_FILES = 1_200;
const DEEPEN_MAX_COMMITS = 300;
/** README в корне репозитория, любой регистр и одно из принятых расширений. */
const README_FILE_RE = /^readme(\.(md|markdown|rst|txt|adoc))?$/i;

// ---------- Точка входа ----------

export type CollectOptions = {
  /** Разрешить попытку git clone. По умолчанию true. */
  runGitAnalysis?: boolean;
  /** Максимум PR-ов, которые семплируем. */
  pullsSampleLimit?: number;
  /** Максимум issue-ов, которые семплируем. */
  issuesSampleLimit?: number;
  /** Сколько времени отводим на весь сбор из клона. */
  cloneBudgetMs?: number;
  /**
   * Выбор файлов для AI-ревью по структуре проекта. Вызывается, пока клон
   * открыт. Сам сборщик про ИИ ничего не знает — ему дают функцию.
   */
  selectCodeFiles?: (catalog: CodeCatalogEntry[]) => Promise<string[]>;
};

/** Общий бюджет сбора: клон плюс чтение из него. */
const COLLECT_BUDGET_MS = 200_000;
/** Сколько времени резервируем под чтение, отдавая остаток клону. */
const READ_RESERVE_MS = 60_000;
/** И сколько оставляем на сборку результата после чтения. */
const WRITE_RESERVE_MS = 5_000;
/**
 * Дерево упёрлось в лимит выборки — значит, репозиторий заведомо огромный
 * (divkit: 17 тысяч файлов), и клон с историей туда не доедет. Такие качаем
 * сразу верхушкой. Всем остальным сначала пробуем окно истории: оно нужно
 * метрикам активности, а при неудаче откат на верхушку всё равно есть.
 */
const BIG_REPO_TREE_ENTRIES = TREE_ITEMS_LIMIT;

export async function collectRepoFacts(
  org: string,
  repo: string,
  options: CollectOptions = {},
): Promise<RepoFacts> {
  const trace = makeTrace();
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

  trace('api');

  const flags = computeTreeFlags(treeEntries);
  if (!flags.hasReadme) missing.push('readme_missing');
  if (!flags.hasLicense) missing.push('license_missing');

  // 3. shallow-клон: история, lock-файлы, README, языки, признаки секретов
  let gitHistory: GitHistoryFacts = emptyGitHistoryFacts();
  let lockfileContents: { packageLockJson?: string; pnpmLockYaml?: string } = {};
  let readme: string | null = null;
  let languages: LanguageShare[] = [];
  let code: CodeFacts = emptyCodeFacts();
  let gitGraph: GitGraph = emptyGitGraph();

  if ((options.runGitAnalysis ?? true) && cloneUrlHttps) {
    try {
      const budgetEnd = Date.now() + (options.cloneBudgetMs ?? COLLECT_BUDGET_MS);
      await withRepoClone(
        {
          cloneUrlHttps,
          token: process.env.SOURCECRAFT_PAT ?? undefined,
          strategy: treeEntries.length >= BIG_REPO_TREE_ENTRIES ? 'tip' : 'window',
          totalTimeoutMs: Math.max(30_000, budgetEnd - Date.now() - READ_RESERVE_MS),
        },
        async (repoClone) => {
          // Дедлайн один на всё чтение из клона: любая часть, которая в него
          // не уложилась, отдаёт то, что успела, и помечает себя неполной.
          const deadline = budgetEnd - WRITE_RESERVE_MS;

          // Индекс путь→oid строится одним обходом дерева и дальше кормит
          // всех: метрики кода, скан секретов, lock-файлы, README.
          trace(repoClone.tipOnly ? 'clone (верхушка)' : 'clone');

          const clone = await openIndexedClone(repoClone);
          trace(`индекс (${clone.files.length} файлов)`);
          languages = detectLanguages(clone.files);

          // Вторая попытка клона берёт только верхушку: файлы есть, истории нет.
          if (repoClone.tipOnly) missing.push('clone_tip_only');

          // Лог коммитов читают двое — читаем один раз.
          let commits: RawCommit[] = [];
          try {
            commits = repoClone.tipOnly ? [] : await readCloneCommits(repoClone, COMMIT_LIMIT);
          } catch (err) {
            missing.push(`git_history_failed:${describe(err)}`);
          }
          trace(`лог (${commits.length} коммитов)`);

          const [history, codeFacts, extras] = await Promise.all([
            analyzeGitHistoryInClone(clone, { commits, deadline, hasHistory: !repoClone.tipOnly }),
            collectCodeFacts(clone, { deadline, selectFiles: options.selectCodeFiles }),
            readFilesFromClone(
              clone.repo,
              clone.index,
              [
                'package-lock.json',
                'pnpm-lock.yaml',
                clone.files.find((path) => README_FILE_RE.test(path)) ?? '',
              ].filter(Boolean),
              { deadline },
            ),
          ]);

          trace(`чтение файлов (${codeFacts.scannedFiles})`);

          gitHistory = history;
          code = codeFacts;
          lockfileContents = {
            packageLockJson: extras.files.get('package-lock.json'),
            pnpmLockYaml: extras.files.get('pnpm-lock.yaml'),
          };

          // Дерево пути создания — единственное, ради чего нужна вся история.
          // Дотягиваем её последней и только на остаток бюджета: без неё анализ
          // полноценный, а на большом репозитории добор идёт долго.
          const leftMs = deadline - Date.now();
          const worthDeepening =
            clone.files.length <= DEEPEN_MAX_FILES && commits.length <= DEEPEN_MAX_COMMITS;
          if (worthDeepening && leftMs > DEEPEN_MIN_LEFT_MS) {
            await deepenClone(repoClone, { timeoutMs: Math.min(leftMs, DEEPEN_MAX_MS) });
            try {
              commits = await readCloneCommits(repoClone, COMMIT_LIMIT);
            } catch {
              // остаёмся с тем логом, который уже прочитали
            }
          }
          // Дерева без истории не бывает — у клона-верхушки его просто нет.
          if (commits.length > 0) {
            gitGraph = await collectGitGraph(repoClone, { commits });
            trace('дерево коммитов');
          }

          const readmePath = clone.files.find((path) => README_FILE_RE.test(path));
          readme = readmePath ? (extras.files.get(readmePath) ?? null) : null;
        },
      );
    } catch (err) {
      missing.push(`git_clone_failed:${describe(err)}`);
    }
  } else if (!cloneUrlHttps) {
    missing.push('clone_url_missing');
  } else {
    // Клон отключили опцией — исходников мы не видели, и код оценивать нечем.
    missing.push('clone_unavailable');
  }

  // Язык из API приходит не всегда — тогда берём самый частый по файлам.
  const apiLanguage = repository?.language?.name ?? null;
  const language = apiLanguage ?? languages[0]?.name ?? null;
  if (!language) missing.push('language_unknown');

  // Причины, по которым код остался непрочитанным, объясняются пользователю
  // так же, как остальные пробелы в данных.
  for (const error of code.errors) missing.push(error);
  for (const error of gitGraph.errors) missing.push(error);

  trace('клон целиком');

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
    language,
    languages,
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
    gitGraph,
    code,
    security: scanResult,
    readme,
    missing: dedupeStrings(missing),
  };
}

/**
 * README в корне репозитория. Имя ищем по списку файлов, а не перебором
 * вариантов: регистр и расширение в проектах пишут как угодно
 * (README.md, readme.MD, Readme.rst), а промахнуться нельзя — это главный
 * вход для AI-оценки документации.
 */
// ---------- helpers ----------

/**
 * Отметки времени по фазам сбора. Включается PULSE_TRACE=1 — без него
 * ничего не пишет: это диагностика «почему на этом репозитории долго».
 */
function makeTrace(): (label: string) => void {
  if (process.env.PULSE_TRACE !== '1') return () => {};
  const started = Date.now();
  let last = started;
  return (label: string) => {
    const now = Date.now();
    console.log(
      `[collect] ${label}: +${((now - last) / 1000).toFixed(1)}с (всего ${((now - started) / 1000).toFixed(1)}с)`,
    );
    last = now;
  };
}

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
