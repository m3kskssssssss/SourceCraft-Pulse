// CLI-обёртка над collectRepoFacts. Служит проверкой этапов:
//   - без флагов: печатает краткое резюме RepoFacts
//   - --score: прогоняет scoreRepo и печатает AnalysisResult (детерминированно)
//   - --score --ai: дополнительно вызывает четыре AI-задачи через RouterAI —
//                    рубрику README, ревью кода, digest по PR/issue и красивые
//                    формулировки рекомендаций. Все вызовы идут через
//                    in-memory кэш и печатают телеметрию в stdout.
//   - PULSE_COLLECT_FULL=1: полный RepoFacts в конце
//
// Требует SOURCECRAFT_PAT в .env для сбора; AI_* — только при --ai.

import 'dotenv/config';
import { collectRepoFacts } from '../lib/collect';
import { scoreRepo } from '../lib/scoring';
import { InMemoryAiCache } from '../lib/ai/cache';
import { ConsoleAiTelemetry } from '../lib/ai/telemetry';
import { getAiProvider } from '../lib/ai/router';
import { runAiAnalysis } from '../lib/ai/pipeline';

type Args = { org: string; repo: string; score: boolean; ai: boolean };

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2).filter(Boolean);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const positional = args.filter((a) => !a.startsWith('--'));
  const score = flags.has('--score') || flags.has('--ai');
  const ai = flags.has('--ai');

  if (positional.length === 0) exitWithUsage('org/repo не указан');
  if (positional.length === 1) {
    const combined = positional[0]!;
    const parts = combined.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      exitWithUsage(`не удалось разобрать «${combined}» как <org>/<repo>`);
    }
    return { org: parts[0]!, repo: parts[1]!, score, ai };
  }
  const [org, repo] = positional;
  if (!org || !repo) exitWithUsage('org и repo не должны быть пустыми');
  return { org: org!, repo: repo!, score, ai };
}

function exitWithUsage(reason: string): never {
  console.error(`Ошибка: ${reason}`);
  console.error('Использование: pnpm collect <org> <repo> [--score] [--ai]');
  process.exit(2);
}

async function main(): Promise<void> {
  const { org, repo, score, ai } = parseArgs(process.argv);
  console.log(`Собираем факты о ${org}/${repo} ...`);

  const started = Date.now();
  const facts = await collectRepoFacts(org, repo);
  const elapsedCollect = Date.now() - started;

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
    gitGraph: {
      available: facts.gitGraph.available,
      totalRead: facts.gitGraph.totalRead,
      kept: facts.gitGraph.commits.length,
      laneCount: facts.gitGraph.laneCount,
      skipped: facts.gitGraph.skipped,
      truncated: facts.gitGraph.truncated,
      firstCommitDate: facts.gitGraph.firstCommitDate,
      merges: facts.gitGraph.commits.filter((c) => c.parents.length > 1).length,
      refs: facts.gitGraph.commits.flatMap((c) => c.refs).slice(0, 8),
      errors: facts.gitGraph.errors,
    },
    code: {
      available: facts.code.available,
      sourceFiles: facts.code.sourceFiles,
      testFiles: facts.code.testFiles,
      scannedFiles: facts.code.scannedFiles,
      medianFileLines: facts.code.medianFileLines,
      longFileSharePercent: facts.code.longFileSharePercent,
      commentSharePercent: facts.code.commentSharePercent,
      todoPerKiloLines: facts.code.todoPerKiloLines,
      sample: facts.code.sample.map((f) => `${f.path} (${f.lines})`),
      errors: facts.code.errors,
    },
    security: {
      provider: facts.security.provider,
      available: facts.security.available,
      vulnerabilities: facts.security.vulnerabilities.length,
      totalScanned: facts.security.totalScanned,
    },
    missing: facts.missing,
    elapsedMs: elapsedCollect,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!score) return;

  // ---- AI-часть (опциональная) ----
  let aiDocsScore: { value: number; summary?: string } | null = null;
  let aiCodeScore: { value: number; summary?: string } | null = null;
  let aiOutputs: Record<string, unknown> | null = null;

  if (ai) {
    console.log('\n--- AI (RouterAI) ---');
    const provider = getAiProvider();
    // CLI работает и без БД, поэтому кэш и телеметрия здесь in-memory.
    const telemetry = new ConsoleAiTelemetry();

    const outcome = await runAiAnalysis({
      provider,
      cache: new InMemoryAiCache(),
      telemetry,
      facts,
      recommendations: scoreRepo(facts).recommendations,
    });

    aiDocsScore = outcome.aiDocsScore;
    aiCodeScore = outcome.aiCodeScore;
    aiOutputs = {
      ...outcome.outputs,
      codeFindings: outcome.codeFindings,
      elapsedMs: outcome.elapsedMs,
      monthlySpendRub: await telemetry.monthlySpendRub(),
    };
  }

  const result = scoreRepo(facts, { aiDocsScore, aiCodeScore });
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
  console.log('\n--- Оценка ---');
  console.log(JSON.stringify(scoreSummary, null, 2));

  if (aiOutputs) {
    console.log('\n--- AI-выходы ---');
    console.log(JSON.stringify(aiOutputs, null, 2));
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
