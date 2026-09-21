// Факты из репозитория: активность по коммитам и признаки секретов в коде.
//
// Работает на уже открытом shallow-клоне (см. clone.ts) — один клон обслуживает
// и историю, и чтение файлов, и скан секретов.
//
// Скан секретов идёт по файлам на HEAD, а не по диффам истории: shallow-клон
// без рабочей копии diff-статистики не даёт, а считать дифф на каждый коммит —
// это обход дерева на каждый коммит. Поэтому «секрет в коде», а не «в истории».

import git from 'isomorphic-git';
import fs from 'node:fs';
import { listFilesInClone, readFileFromClone, type RepoClone } from './clone';
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
  /** Готовый список файлов на HEAD, если вызывающий уже его читал. */
  files?: string[];
};

const DEFAULT_COMMIT_LIMIT = 2_000;
const DEFAULT_SECRETS_FILE_LIMIT = 300;
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
  repo: RepoClone,
  options: AnalyzeGitHistoryOptions = {},
): Promise<GitHistoryFacts> {
  const errors: string[] = [];

  let commits: CommitRecord[];
  try {
    commits = await readCommits(repo, options.commitLimit ?? DEFAULT_COMMIT_LIMIT);
  } catch (err) {
    return emptyGitHistoryFacts([`git_history_failed: ${describeError(err)}`]);
  }

  const stats = aggregateGitStats(commits);

  let secretHits: SecretHit[] = [];
  let secretsScannedFiles = 0;
  try {
    const scan = await scanCloneForSecrets(
      repo,
      options.secretsFileLimit ?? DEFAULT_SECRETS_FILE_LIMIT,
      options.files,
    );
    secretHits = scan.hits;
    secretsScannedFiles = scan.scannedFiles;
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

async function readCommits(repo: RepoClone, limit: number): Promise<CommitRecord[]> {
  const log = await git.log({ fs, dir: repo.dir, ref: repo.headOid, depth: limit });
  return log.map((entry) => ({
    sha: entry.oid,
    authorName: entry.commit.author.name,
    authorEmail: entry.commit.author.email,
    // isomorphic-git отдаёт unix-время автора в секундах.
    authorDate: new Date(entry.commit.author.timestamp * 1000).toISOString(),
    subject: entry.commit.message.split('\n', 1)[0] ?? '',
  }));
}

async function scanCloneForSecrets(
  repo: RepoClone,
  fileLimit: number,
  knownFiles?: string[],
): Promise<{ hits: SecretHit[]; scannedFiles: number }> {
  const all = knownFiles ?? (await listFilesInClone(repo));
  const paths = all.filter(isScannable).slice(0, fileLimit);

  const hits: SecretHit[] = [];
  let scannedFiles = 0;

  for (const path of paths) {
    const content = await readFileFromClone(repo, path);
    if (content === null || content.length > SECRETS_MAX_FILE_BYTES) continue;
    scannedFiles += 1;
    for (const hit of scanForSecrets(content)) {
      hits.push({ ...hit, file: path });
    }
  }

  return { hits, scannedFiles };
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
