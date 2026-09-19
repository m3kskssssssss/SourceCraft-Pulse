// Анализ git-истории.
//
// Разбит на две части:
//   - analyzeGitHistoryInClone(workDir, options) — работает на существующем bare-клоне
//   - analyzeGitHistory({cloneUrlHttps, token}) — сам создаёт и удаляет клон
//
// Второй вариант удобен для одноразовых прогонов; первый — когда клон уже
// открыт и мы хотим переиспользовать его (например, вместе с чтением lock-файлов).
//
// ВАЖНО: этот модуль запускается ТОЛЬКО в воркере. Никогда — из App Router / API-роутов.

import { runGit, withBareClone, type BareCloneOptions } from './clone';
import { GIT_LOG_PRETTY_FORMAT, aggregateGitStats, parseGitLog } from './log-parser';
import { scanForSecrets, type SecretHit } from './secrets';

export type GitHistoryFacts = {
  available: boolean;
  commitsLast90Days: number | null;
  uniqueAuthorsLast90Days: number | null;
  lastCommitDate: string | null;
  topAuthorSharePercent: number | null;
  totalCommits: number | null;
  secretHits: SecretHit[];
  secretsScanCommitLimit: number;
  errors: string[];
};

export type AnalyzeGitHistoryOptions = {
  timeoutMs?: number;
  secretsCommitLimit?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_SECRETS_COMMIT_LIMIT = 500;

/** Работает на уже созданном bare-клоне. */
export async function analyzeGitHistoryInClone(
  workDir: string,
  options: AnalyzeGitHistoryOptions = {},
): Promise<GitHistoryFacts> {
  const errors: string[] = [];
  const secretsCommitLimit = options.secretsCommitLimit ?? DEFAULT_SECRETS_COMMIT_LIMIT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const logOutput = await runGit(
      ['log', '--all', '--numstat', `--pretty=format:${GIT_LOG_PRETTY_FORMAT}`],
      { cwd: workDir, timeoutMs },
    );
    const commits = parseGitLog(logOutput);
    const stats = aggregateGitStats(commits);

    let secretHits: SecretHit[] = [];
    try {
      const patchOutput = await runGit(
        ['log', '-p', '--unified=0', `-n${secretsCommitLimit}`, '--all'],
        { cwd: workDir, timeoutMs, maxBufferBytes: 32 * 1024 * 1024 },
      );
      secretHits = scanForSecrets(patchOutput);
    } catch (err) {
      errors.push(`secrets_scan_failed: ${describeError(err)}`);
    }

    return {
      available: true,
      commitsLast90Days: stats.commitsLast90Days,
      uniqueAuthorsLast90Days: stats.uniqueAuthorsLast90Days,
      lastCommitDate: stats.lastCommitDate,
      topAuthorSharePercent: stats.topAuthorSharePercent,
      totalCommits: stats.totalCommits,
      secretHits,
      secretsScanCommitLimit: secretsCommitLimit,
      errors,
    };
  } catch (err) {
    errors.push(`git_history_failed: ${describeError(err)}`);
    return {
      available: false,
      commitsLast90Days: null,
      uniqueAuthorsLast90Days: null,
      lastCommitDate: null,
      topAuthorSharePercent: null,
      totalCommits: null,
      secretHits: [],
      secretsScanCommitLimit: secretsCommitLimit,
      errors,
    };
  }
}

/** Клонирует, анализирует, удаляет — самодостаточный проход. */
export async function analyzeGitHistory(
  options: BareCloneOptions & AnalyzeGitHistoryOptions,
): Promise<GitHistoryFacts> {
  try {
    return await withBareClone(options, (workDir) => analyzeGitHistoryInClone(workDir, options));
  } catch (err) {
    return {
      available: false,
      commitsLast90Days: null,
      uniqueAuthorsLast90Days: null,
      lastCommitDate: null,
      topAuthorSharePercent: null,
      totalCommits: null,
      secretHits: [],
      secretsScanCommitLimit: options.secretsCommitLimit ?? DEFAULT_SECRETS_COMMIT_LIMIT,
      errors: [`git_clone_failed: ${describeError(err)}`],
    };
  }
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
