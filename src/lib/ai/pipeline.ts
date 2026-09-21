// Оркестрация AI-задач одного анализа.
//
// Единственное место, где они запускаются: им пользуются и воркер, и
// серверный маршрут на Vercel, и CLI. Раньше каждый вызывал задачи сам,
// последовательно — три круга ожидания вместо одного.
//
// Задач четыре, они независимы и идут параллельно:
//   readme_rubric       — балл документации вместо эвристик;
//   code_review         — балл категории «Код» по выборке исходников;
//   pr_issues_digest    — выжимка по PR и issue;
//   recommendation_copy — человеческие формулировки рекомендаций.
//
// Задача «красивые рекомендации» раньше ждала рубрику (через предварительный
// scoreRepo), теперь получает рекомендации, посчитанные без ИИ: AI-оценки
// сдвигают только свои категории, а совпадение по ключу всё равно
// проверяется на выходе.
//
// Падение одной задачи не трогает остальные и не роняет анализ: категория
// тогда считается по измеримым метрикам.

import type { RepoFacts } from '../collect';
import type { Recommendation } from '../scoring/types';
import type { AiCache } from './cache';
import type { AiProvider } from './provider';
import type { AiTelemetry } from './telemetry';
import { runReadmeRubric } from './tasks/readme-rubric';
import { runCodeReview } from './tasks/code-review';
import { runPrIssuesDigest } from './tasks/pr-issues-digest';
import { runRecommendationCopy } from './tasks/recommendation-copy';

export type AiDocsScore = { value: number; summary?: string };
export type AiCodeScore = { value: number; summary?: string };

export type AiAnalysisResult = {
  /** Оценка документации от модели. null — задача не прошла, docs считаем эвристикой. */
  aiDocsScore: AiDocsScore | null;
  /** Оценка кода от модели. null — задача не прошла, code считаем по code-facts. */
  aiCodeScore: AiCodeScore | null;
  /** Находки ревьюера — показываем рядом с категорией «Код». */
  codeFindings: string[];
  /** Прошло ли ревью кода и почему нет. Показывается на странице анализа. */
  codeReview: { ok: true } | { ok: false; reason: string };
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
  /** Рекомендации из scoreRepo без AI-оценок категорий. */
  recommendations: Recommendation[];
};

export async function runAiAnalysis(args: RunAiAnalysisArgs): Promise<AiAnalysisResult> {
  const { provider, cache, telemetry, facts, recommendations } = args;
  const orgRepo = `${facts.org}/${facts.repo}`;
  const started = Date.now();

  // Ревью без исходников — это оценка вслепую: модель поставит балл по одним
  // метрикам, а выглядеть будет как прочитанный код. Лучше честно не звать.
  const hasCode = facts.code.sample.length > 0;

  const [rubric, review, digest, copy] = await Promise.all([
    guard('readme_rubric', () => runReadmeRubric({ provider, cache, telemetry, facts })),
    hasCode
      ? guard('code_review', () => runCodeReview({ provider, cache, telemetry, facts }))
      : Promise.resolve<AiTaskFailure>({ unavailable: true, reason: 'no_code_sample' }),
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
  const aiCodeScore =
    'value' in review ? { value: review.value.score, summary: review.value.summary } : null;
  const codeFindings = 'value' in review ? review.value.findings : [];
  const codeReview: AiAnalysisResult['codeReview'] =
    'value' in review ? { ok: true } : { ok: false, reason: review.reason };

  return {
    aiDocsScore,
    aiCodeScore,
    codeFindings,
    codeReview,
    outputs: {
      readmeRubric: rubric,
      codeReview: review,
      prIssuesDigest: digest,
      recommendationCopy: copy,
    },
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
