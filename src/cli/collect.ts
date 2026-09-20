// CLI-обёртка над collectRepoFacts. Служит проверкой Этапа 2 и Этапа 3:
//   - без флага: печатает краткое резюме RepoFacts
//   - с флагом --score: дополнительно прогоняет scoreRepo и печатает AnalysisResult
//   - PULSE_COLLECT_FULL=1: выводит полный RepoFacts после резюме
//
// Использование:
//   pnpm collect <org> <repo>
//   pnpm collect <org>/<repo> [--score]
//
// Требует SOURCECRAFT_PAT в .env.

import 'dotenv/config';
import { collectRepoFacts } from '../lib/collect';
import { scoreRepo } from '../lib/scoring';

function parseArgs(argv: string[]): { org: string; repo: string; score: boolean } {
  const args = argv.slice(2).filter(Boolean);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const positional = args.filter((a) => !a.startsWith('--'));
  const score = flags.has('--score');

  if (positional.length === 0) exitWithUsage('org/repo не указан');
  if (positional.length === 1) {
    const combined = positional[0]!;
    const parts = combined.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      exitWithUsage(`не удалось разобрать «${combined}» как <org>/<repo>`);
    }
    return { org: parts[0]!, repo: parts[1]!, score };
  }
  const [org, repo] = positional;
  if (!org || !repo) exitWithUsage('org и repo не должны быть пустыми');
  return { org: org!, repo: repo!, score };
}

function exitWithUsage(reason: string): never {
  console.error(`Ошибка: ${reason}`);
  console.error('Использование: pnpm collect <org> <repo> [--score]');
  process.exit(2);
}

async function main(): Promise<void> {
  const { org, repo, score } = parseArgs(process.argv);
  console.log(`Собираем факты о ${org}/${repo} ...`);

  const started = Date.now();
  const facts = await collectRepoFacts(org, repo);
  const elapsedMs = Date.now() - started;

  const summary = {
    org: facts.org,
    repo: facts.repo,
    language: facts.language,
    defaultBranch: facts.defaultBranch,
    counters: facts.counters,
    contributors: facts.contributors.length,
    treeEntries: facts.tree.entriesCount,
    treeFlags: facts.tree.flags,
    branches: facts.branches.length,
    tags: facts.tags.length,
    releases: facts.releases.length,
    latestRelease: facts.latestRelease ? true : null,
    pullRequestsSample: facts.pullRequests.length,
    issuesSample: facts.issues.length,
    readmeChars: facts.readme?.length ?? 0,
    gitHistory: {
      available: facts.gitHistory.available,
      commitsLast90Days: facts.gitHistory.commitsLast90Days,
      uniqueAuthorsLast90Days: facts.gitHistory.uniqueAuthorsLast90Days,
      lastCommitDate: facts.gitHistory.lastCommitDate,
      topAuthorSharePercent: facts.gitHistory.topAuthorSharePercent,
      secretHits: facts.gitHistory.secretHits.map((s) => s.name),
      errors: facts.gitHistory.errors,
    },
    security: {
      provider: facts.security.provider,
      available: facts.security.available,
      vulnerabilities: facts.security.vulnerabilities.length,
      totalScanned: facts.security.totalScanned,
    },
    missing: facts.missing,
    elapsedMs,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (score) {
    console.log('\n--- Оценка ---');
    const result = scoreRepo(facts);
    const scoreSummary = {
      score: result.score,
      scoreBeforePenalties: result.scoreBeforePenalties,
      categories: result.categoryScores.map((c) => ({
        key: c.key,
        value: c.value,
        known: c.metrics.filter((m) => !m.unknown).length,
        unknown: c.metrics.filter((m) => m.unknown).length,
      })),
      penalties: result.penalties,
      recommendations: result.recommendations,
    };
    console.log(JSON.stringify(scoreSummary, null, 2));
  }

  if (process.env.PULSE_COLLECT_FULL === '1') {
    console.log('\n--- полные RepoFacts (PULSE_COLLECT_FULL=1) ---');
    console.log(JSON.stringify(facts, null, 2));
  }
}

main().catch((err: unknown) => {
  console.error('Ошибка сбора:', err);
  process.exit(1);
});
