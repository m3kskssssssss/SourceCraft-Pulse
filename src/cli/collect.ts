// CLI-обёртка над collectRepoFacts. Служит проверкой этапов:
//   - без флагов: печатает краткое резюме RepoFacts
//   - --score: прогоняет scoreRepo и печатает AnalysisResult (детерминированно)
//   - --score --ai: дополнительно вызывает AI-рубрику, digest и красивые
//                    формулировки рекомендаций через RouterAI. Все вызовы
//                    идут через in-memory кэш и печатают телеметрию в stdout.
//   - PULSE_COLLECT_FULL=1: полный RepoFacts в конце
//
// Требует SOURCECRAFT_PAT в .env для сбора; AI_* — только при --ai.

import 'dotenv/config';
import { collectRepoFacts } from '../lib/collect';
import { scoreRepo } from '../lib/scoring';
import { InMemoryAiCache } from '../lib/ai/cache';
import { ConsoleAiTelemetry } from '../lib/ai/telemetry';
import { getAiProvider } from '../lib/ai/router';
import { runReadmeRubric } from '../lib/ai/tasks/readme-rubric';
import { runPrIssuesDigest } from '../lib/ai/tasks/pr-issues-digest';
import { runRecommendationCopy } from '../lib/ai/tasks/recommendation-copy';

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
  let aiOutputs: Record<string, unknown> | null = null;

  if (ai) {
    console.log('\n--- AI (RouterAI) ---');
    const provider = getAiProvider();
    const cache = new InMemoryAiCache();
    const telemetry = new ConsoleAiTelemetry();

    const runSafely = async <T>(name: string, fn: () => Promise<T>): Promise<T | { error: string }> => {
      try {
        return await fn();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`AI task ${name} упала, продолжаем без неё: ${message.slice(0, 200)}`);
        return { error: message };
      }
    };

    // 1. Рубрика README — если упала, оставляем docs на heuristic
    const rubric = await runSafely('readme_rubric', () =>
      runReadmeRubric({ provider, cache, telemetry, facts }),
    );
    if ('value' in rubric) {
      aiDocsScore = { value: rubric.value.score, summary: rubric.value.summary };
    }

    // 2. Дайджест PR/issues (не влияет на score)
    const digest = await runSafely('pr_issues_digest', () =>
      runPrIssuesDigest({ provider, cache, telemetry, facts }),
    );

    // 3. Красивые формулировки на топ-3 рекомендации
    const preliminary = scoreRepo(facts, aiDocsScore ? { aiDocsScore } : {});
    const copy = await runSafely('recommendation_copy', () =>
      runRecommendationCopy({
        provider,
        cache,
        telemetry,
        orgRepo: `${org}/${repo}`,
        language: facts.language,
        recommendations: preliminary.recommendations,
      }),
    );

    aiOutputs = {
      readmeRubric: rubric,
      prIssuesDigest: digest,
      recommendationCopy: copy,
      monthlySpendRub: await telemetry.monthlySpendRub(),
    };
  }

  const result = scoreRepo(facts, aiDocsScore ? { aiDocsScore } : {});
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
