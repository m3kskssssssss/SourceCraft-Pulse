// Оркестрация трёх AI-задач одного анализа.
//
// Единственное место, где они запускаются: им пользуются и воркер, и
// серверный маршрут на Vercel, и CLI. Раньше каждый вызывал задачи сам,
// последовательно — три круга ожидания вместо одного.
//
// Задачи независимы и идут параллельно. Задача «красивые рекомендации»
// раньше ждала рубрику (через предварительный scoreRepo), теперь получает
// рекомендации, посчитанные без ИИ: AI-оценка документации сдвигает только
// категорию docs, а совпадение по ключу всё равно проверяется на выходе.
//
// Падение одной задачи не трогает остальные и не роняет анализ.

import type { RepoFacts } from '../collect';
import type { Recommendation } from '../scoring/types';
import type { AiCache } from './cache';
import type { AiProvider } from './provider';
import type { AiTelemetry } from './telemetry';
import { runReadmeRubric } from './tasks/readme-rubric';
import { runPrIssuesDigest } from './tasks/pr-issues-digest';
import { runRecommendationCopy } from './tasks/recommendation-copy';

export type AiDocsScore = { value: number; summary?: string };

export type AiAnalysisResult = {
  /** Оценка документации от модели. null — задача не прошла, docs считаем эвристикой. */
  aiDocsScore: AiDocsScore | null;
  /** Сырые выходы всех задач — уходят в analyses.metrics.ai. */
  outputs: Record<string, unknown>;
  /** Сколько заняли AI-задачи целиком, мс. */
  elapsedMs: number;
};

export type RunAiAnalysisArgs = {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  facts: RepoFacts;
  /** Рекомендации из scoreRepo без AI-оценки документации. */
  recommendations: Recommendation[];
};

export async function runAiAnalysis(args: RunAiAnalysisArgs): Promise<AiAnalysisResult> {
  const { provider, cache, telemetry, facts, recommendations } = args;
  const orgRepo = `${facts.org}/${facts.repo}`;
  const started = Date.now();

  const [rubric, digest, copy] = await Promise.all([
    guard('readme_rubric', () => runReadmeRubric({ provider, cache, telemetry, facts })),
    guard('pr_issues_digest', () => runPrIssuesDigest({ provider, cache, telemetry, facts })),
    guard('recommendation_copy', () =>
      runRecommendationCopy({
        provider,
        cache,
        telemetry,
        orgRepo,
        language: facts.language,
        recommendations,
      }),
    ),
  ]);

  const aiDocsScore =
    'value' in rubric ? { value: rubric.value.score, summary: rubric.value.summary } : null;

  return {
    aiDocsScore,
    outputs: { readmeRubric: rubric, prIssuesDigest: digest, recommendationCopy: copy },
    elapsedMs: Date.now() - started,
  };
}

/** Результат упавшей задачи: помечаем «нет данных», но анализ продолжаем. */
export type AiTaskFailure = { unavailable: true; reason: string };

async function guard<T>(name: string, fn: () => Promise<T>): Promise<T | AiTaskFailure> {
  try {
    return await fn();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[ai] задача ${name} не прошла: ${reason.slice(0, 200)}`);
    return { unavailable: true, reason: reason.slice(0, 500) };
  }
}
