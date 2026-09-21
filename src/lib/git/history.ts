// Факты из репозитория: активность по коммитам и признаки секретов в коде.
//
// Работает на уже открытом shallow-клоне (см. clone.ts) — один клон обслуживает
// и историю, и чтение файлов, и скан секретов.
//
// Скан секретов идёт по файлам на HEAD, а не по диффам истории: shallow-клон
// без рабочей копии diff-статистики не даёт, а считать дифф на каждый коммит —
// это обход дерева на каждый коммит. Поэтому «секрет в коде», а не «в истории».

import { readFilesFromClone, type IndexedClone } from './clone';
import { readCloneCommits, type RawCommit } from './commits';
import { aggregateGitStats, type CommitRecord } from './stats';
import { scanForSecrets, type SecretHit } from './secrets';

export type GitHistoryFacts = {
  available: boolean;
  commitsLast90Days: number | null;
  uniqueAuthorsLast90Days: number | null;
  lastCommitDate: string | null;
  topAuthorSharePercent: number | null;
  secretHits: SecretHit[];
  /** Сколько файлов на HEAD успели просмотреть в поиске секретов. */
  secretsScannedFiles: number;
  errors: string[];
};

export type AnalyzeGitHistoryOptions = {
  /** Максимум коммитов, которые читаем из клона. */
  commitLimit?: number;
  /** Максимум файлов, которые просматриваем на секреты. */
  secretsFileLimit?: number;
  /** Уже прочитанный лог: его делят метрики активности и дерево коммитов. */
  commits?: RawCommit[];
  /**
   * Есть ли в клоне история вообще. У клона-верхушки её нет, и тогда метрики
   * активности должны остаться неизвестными, а не показать «ноль коммитов».
   */
  hasHistory?: boolean;
  /** Момент, после которого скан секретов прекращается. */
  deadline?: number;
};

const DEFAULT_COMMIT_LIMIT = 2_000;
const DEFAULT_SECRETS_FILE_LIMIT = 800;
/** Файлы крупнее не смотрим: собранные бандлы и данные дают только шум. */
const SECRETS_MAX_FILE_BYTES = 256 * 1024;

/** Расширения, в которых секрет — реальная находка, а не случайная строка. */
const SCANNABLE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.php', '.go', '.java', '.kt', '.kts', '.cs', '.rs', '.swift',
  '.sh', '.bash', '.zsh', '.ps1',
  '.yml', '.yaml', '.json', '.toml', '.ini', '.cfg', '.conf', '.properties',
  '.xml', '.tf', '.tfvars', '.gradle', '.env', '.example', '.sample', '.md',
];

export function emptyGitHistoryFacts(errors: string[] = []): GitHistoryFacts {
  return {
    available: false,
    commitsLast90Days: null,
    uniqueAuthorsLast90Days: null,
    lastCommitDate: null,
    topAuthorSharePercent: null,
    secretHits: [],
    secretsScannedFiles: 0,
    errors,
  };
}

export async function analyzeGitHistoryInClone(
  clone: IndexedClone,
  options: AnalyzeGitHistoryOptions = {},
): Promise<GitHistoryFacts> {
  const errors: string[] = [];

  const hasHistory = options.hasHistory ?? true;
  if (!hasHistory) errors.push('history_unavailable');

  let commits: CommitRecord[];
  try {
    const raw = options.commits ?? (await readCloneCommits(clone.repo, options.commitLimit ?? DEFAULT_COMMIT_LIMIT));
    commits = raw.map((entry) => ({
      sha: entry.oid,
      authorName: entry.authorName,
      authorEmail: entry.authorEmail,
      authorDate: entry.authorDate,
      subject: entry.subject,
    }));
  } catch (err) {
    return emptyGitHistoryFacts([`git_history_failed: ${describeError(err)}`]);
  }

  // Без истории показатели активности неизвестны: ноль коммитов в клоне
  // означает «мы их не качали», а не «их нет».
  const stats = hasHistory
    ? aggregateGitStats(commits)
    : {
        commitsLast90Days: null,
        uniqueAuthorsLast90Days: null,
        lastCommitDate: null,
        topAuthorSharePercent: null,
      };

  let secretHits: SecretHit[] = [];
  let secretsScannedFiles = 0;
  try {
    const scan = await scanCloneForSecrets(
      clone,
      options.secretsFileLimit ?? DEFAULT_SECRETS_FILE_LIMIT,
      options.deadline,
    );
    secretHits = scan.hits;
    secretsScannedFiles = scan.scannedFiles;
    if (!scan.complete) errors.push('secrets_scan_partial');
  } catch (err) {
    errors.push(`secrets_scan_failed: ${describeError(err)}`);
  }

  return {
    available: true,
    commitsLast90Days: stats.commitsLast90Days,
    uniqueAuthorsLast90Days: stats.uniqueAuthorsLast90Days,
    lastCommitDate: stats.lastCommitDate,
    topAuthorSharePercent: stats.topAuthorSharePercent,
    secretHits,
    secretsScannedFiles,
    errors,
  };
}

async function scanCloneForSecrets(
  clone: IndexedClone,
  fileLimit: number,
  deadline?: number,
): Promise<{ hits: SecretHit[]; scannedFiles: number; complete: boolean }> {
  const paths = clone.files.filter(isScannable).slice(0, fileLimit);
  const { files, complete } = await readFilesFromClone(clone.repo, clone.index, paths, {
    maxFileBytes: SECRETS_MAX_FILE_BYTES,
    deadline,
  });

  const hits: SecretHit[] = [];
  for (const [path, content] of files) {
    for (const hit of scanForSecrets(content)) {
      hits.push({ ...hit, file: path });
    }
  }

  return { hits, scannedFiles: files.size, complete };
}

function isScannable(path: string): boolean {
  const lower = path.toLowerCase();
  const name = lower.slice(lower.lastIndexOf('/') + 1);
  // .env, .env.local и подобные — первые кандидаты на утёкший секрет.
  if (name.startsWith('.env')) return true;
  return SCANNABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
