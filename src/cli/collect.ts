// CLI-обёртка над collectRepoFacts. Служит проверкой Этапа 2:
// печатает результат сбора в консоль без обращения к БД.
//
// Использование:
//   pnpm collect <org> <repo>
//   pnpm collect <org>/<repo>
//
// Требует SOURCECRAFT_PAT в .env.

import 'dotenv/config';
import { collectRepoFacts } from '../lib/collect';

function parseArgs(argv: string[]): { org: string; repo: string } {
  const args = argv.slice(2).filter(Boolean);
  if (args.length === 0) {
    exitWithUsage('org/repo не указан');
  }
  if (args.length === 1) {
    const [combined] = args;
    if (!combined) exitWithUsage('org/repo пустой');
    const parts = combined!.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      exitWithUsage(`не удалось разобрать «${combined}» как <org>/<repo>`);
    }
    return { org: parts[0]!, repo: parts[1]! };
  }
  const [org, repo] = args;
  if (!org || !repo) exitWithUsage('org и repo не должны быть пустыми');
  return { org: org!, repo: repo! };
}

function exitWithUsage(reason: string): never {
  console.error(`Ошибка: ${reason}`);
  console.error('Использование: pnpm collect <org> <repo>  либо  pnpm collect <org>/<repo>');
  process.exit(2);
}

async function main(): Promise<void> {
  const { org, repo } = parseArgs(process.argv);
  console.log(`Собираем факты о ${org}/${repo} ...`);

  const started = Date.now();
  const facts = await collectRepoFacts(org, repo);
  const elapsed = Date.now() - started;

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
    elapsedMs: elapsed,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (process.env.PULSE_COLLECT_FULL === '1') {
    console.log('\n--- полные RepoFacts (PULSE_COLLECT_FULL=1) ---');
    console.log(JSON.stringify(facts, null, 2));
  }
}

main().catch((err: unknown) => {
  console.error('Ошибка сбора:', err);
  process.exit(1);
});
