// Один прогон анализа: сбор фактов → оценка → AI → запись результата.
//
// Общий код для двух вызывающих:
//   - маршрут /api/analyses/[id]/run — основной путь на Vercel: функция живёт
//     до 300 с (Fluid compute), этого хватает на весь анализ, очередь нужна
//     только как журнал состояния и защита от параллельных прогонов;
//   - pnpm worker — локальный/ручной прогон пачки задач из очереди.
//
// Ошибки считаются по попыткам: до MAX_ATTEMPTS задача возвращается в очередь,
// после — анализ помечается failed.

import { and, eq, isNull, lt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { analyses, analysisJobs, events, repositories } from '../../db/schema';
import { collectRepoFacts, type RepoFacts } from '../collect';
import { scoreRepo } from '../scoring';
import { DrizzleAiCache } from '../ai/cache';
import { DrizzleAiTelemetry } from '../ai/telemetry';
import { getAiProvider } from '../ai/router';
import { getSetting } from '../settings';
import {
  runAiAnalysis,
  type AiCodeScore,
  type AiDocsScore,
  type RepoKindOutcome,
} from '../ai/pipeline';
import { runFileSelection } from '../ai/tasks/file-selection';
import type { AiCache } from '../ai/cache';
import type { AiProvider } from '../ai/provider';
import type { AiTelemetry } from '../ai/telemetry';

export type AnalysisDb = NodePgDatabase<typeof schema>;

export type ClaimedJob = {
  jobId: string;
  analysisId: string;
  attempts: number;
};

export type ProcessOutcome = 'done' | 'failed' | 'requeued';

export const MAX_ATTEMPTS = 3;
/** Лимит на сбор фактов. Остаток времени функции оставляем на AI и запись. */
const COLLECT_TIMEOUT_MS = 240_000;
/** Сколько ждём выбор файлов моделью: дольше — считаем, что не дождались. */
const SELECTION_TIMEOUT_MS = 30_000;
/**
 * Через сколько чужой лок считается брошенным. Serverless-функция может умереть
 * молча (таймаут, деплой), и без этого задача осталась бы залоченной навсегда.
 */
const STALE_LOCK_MS = 6 * 60 * 1000;

/**
 * Забирает задачу конкретного анализа. Возвращает null, если задачи нет
 * (анализ уже посчитан) или её прямо сейчас считает кто-то другой.
 *
 * Гонки не боимся: UPDATE ... RETURNING атомарен, второй запрос дождётся
 * коммита первого и уже не найдёт строку по условию.
 */
export async function claimJobForAnalysis(
  db: AnalysisDb,
  analysisId: string,
  runnerId: string,
): Promise<ClaimedJob | null> {
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  const rows = await db
    .update(analysisJobs)
    .set({ lockedAt: new Date(), lockedBy: runnerId })
    .where(
      and(
        eq(analysisJobs.analysisId, analysisId),
        lt(analysisJobs.attempts, MAX_ATTEMPTS),
        or(isNull(analysisJobs.lockedAt), lt(analysisJobs.lockedAt, staleBefore)),
      ),
    )
    .returning({ id: analysisJobs.id, attempts: analysisJobs.attempts });

  const row = rows[0];
  return row ? { jobId: row.id, analysisId, attempts: row.attempts } : null;
}

export async function processAnalysis(
  db: AnalysisDb,
  job: ClaimedJob,
  runnerId: string,
): Promise<ProcessOutcome> {
  log(runnerId, `→ job=${job.jobId} analysis=${job.analysisId}`);

  await db.update(analyses).set({ status: 'running' }).where(eq(analyses.id, job.analysisId));

  const analysis = await db.query.analyses.findFirst({ where: eq(analyses.id, job.analysisId) });
  if (!analysis) return failJob(db, job, runnerId, 'analysis_row_missing');

  const repo = await db.query.repositories.findFirst({
    where: eq(repositories.id, analysis.repositoryId),
  });
  if (!repo) return failJob(db, job, runnerId, 'repository_row_missing');

  // Слой ИИ поднимаем до сбора: выбор файлов для ревью делается по структуре
  // проекта, пока клон ещё открыт. Если ИИ не настроен — сбор просто идёт без
  // него, а выборку соберёт эвристика по размеру.
  const ai = await openAi(db, job.analysisId);

  try {
    const facts = await withTimeout(
      collectRepoFacts(repo.orgSlug, repo.repoSlug, {
        selectCodeFiles: ai
          ? (catalog) =>
              withTimeout(
                runFileSelection({
                  ...ai,
                  orgRepo: `${repo.orgSlug}/${repo.repoSlug}`,
                  language: null,
                  catalog,
                }).then((result) => result.value.pick),
                SELECTION_TIMEOUT_MS,
                'file_selection_timeout',
              ).catch(() => [])
          : undefined,
      }),
      COLLECT_TIMEOUT_MS,
      `collect_timeout_${COLLECT_TIMEOUT_MS}ms`,
    );

    // Карточку репозитория подтягиваем из фактов: без этого в таблице
    // repositories навсегда оставались бы одни слаги, а в рейтинге —
    // «язык не определён» и пустая сортировка по популярности.
    await syncRepositoryFromFacts(db, repo.id, facts);

    // AI: четыре задачи параллельно, падение любой не роняет анализ.
    let aiDocsScore: AiDocsScore | null = null;
    let aiCodeScore: AiCodeScore | null = null;
    let aiOutputs: Record<string, unknown> = { unavailable: true, reason: 'ai_not_configured' };
    // Жанр репозитория: решение модели, иначе — вывод эвристики из фактов.
    let repoKind: RepoKindOutcome = {
      kind: facts.kind.kind,
      by: 'heuristic',
      summary: null,
      topics: [],
    };
    if (ai) {
      try {
        const outcome = await runAiAnalysis({
          ...ai,
          facts,
          // Вход для «красивых рекомендаций» — оценка без ИИ.
          recommendations: scoreRepo(facts).recommendations,
        });
        aiDocsScore = outcome.aiDocsScore;
        aiCodeScore = outcome.aiCodeScore;
        repoKind = outcome.repoKind;
        // Находки ревьюера кладём отдельным ключом: страница анализа берёт их
        // оттуда, не разбирая сырой ответ задачи.
        aiOutputs = {
          ...outcome.outputs,
          codeFindings: outcome.codeFindings,
          // Отдельным ключом: `outputs.codeReview` — это сырой ответ задачи,
          // а здесь итог «прошло/не прошло» для страницы анализа.
          codeReviewStatus: outcome.codeReview,
        };
        log(
          runnerId,
          `AI: ${outcome.elapsedMs} мс, жанр — ${outcome.repoKind.kind} (${outcome.repoKind.by}), ` +
            `выборка — ${facts.code.sampleSource}, ревью — ${
              outcome.codeReview.ok ? 'ок' : outcome.codeReview.reason
            }`,
        );
      } catch (aiErr) {
        const message = describe(aiErr);
        log(runnerId, `AI не отработал: ${message}`);
        aiOutputs = { unavailable: true, reason: message };
      }
    }

    const result = scoreRepo(facts, { aiDocsScore, aiCodeScore });

    await db
      .update(analyses)
      .set({
        status: 'done',
        kind: repoKind.kind,
        score: result.score,
        categoryScores: result.categoryScores as unknown as Record<string, unknown>,
        metrics: {
          kind: repoKind as unknown as Record<string, unknown>,
          facts: facts as unknown as Record<string, unknown>,
          penalties: result.penalties,
          scoreBeforePenalties: result.scoreBeforePenalties,
          ai: aiOutputs,
        },
        recommendations: result.recommendations as unknown as Record<string, unknown>,
        missing: result.missing as unknown as Record<string, unknown>,
        error: null,
        finishedAt: new Date(),
      })
      .where(eq(analyses.id, job.analysisId));

    // Задача выполнена — строку из очереди убираем.
    await db.delete(analysisJobs).where(eq(analysisJobs.id, job.jobId));

    await db.insert(events).values({
      kind: 'analysis.completed',
      payload: {
        analysisId: job.analysisId,
        org: repo.orgSlug,
        repo: repo.repoSlug,
        score: result.score,
        missingCount: result.missing.length,
      },
    });

    log(
      runnerId,
      `✓ analysis=${job.analysisId} done, score=${result.score}, missing=${result.missing.length}`,
    );
    return 'done';
  } catch (err) {
    const message = describe(err);
    console.error(`[analysis ${runnerId}] ✗ analysis=${job.analysisId} failed: ${message}`);
    return failJob(db, job, runnerId, message);
  }
}

/** Провайдер, кэш и телеметрия одним куском. null — ИИ не сконфигурирован. */
async function openAi(
  db: AnalysisDb,
  analysisId: string,
): Promise<{ provider: AiProvider; cache: AiCache; telemetry: AiTelemetry } | null> {
  try {
    // Модель берём из настроек админки, ключи — из окружения.
    const model = await getSetting('ai.model', process.env.AI_MODEL ?? '');
    const provider = getAiProvider({ model: model || undefined });
    return {
      provider,
      cache: new DrizzleAiCache(db, { provider: provider.name, model: provider.model }),
      telemetry: new DrizzleAiTelemetry(db, analysisId),
    };
  } catch (err) {
    console.warn(`[analysis] ИИ недоступен: ${describe(err)}`);
    return null;
  }
}

async function failJob(
  db: AnalysisDb,
  job: ClaimedJob,
  runnerId: string,
  message: string,
): Promise<ProcessOutcome> {
  const nextAttempts = job.attempts + 1;

  if (nextAttempts >= MAX_ATTEMPTS) {
    await db
      .update(analyses)
      .set({ status: 'failed', error: message.slice(0, 500), finishedAt: new Date() })
      .where(eq(analyses.id, job.analysisId));
    await db.delete(analysisJobs).where(eq(analysisJobs.id, job.jobId));
    await db.insert(events).values({
      kind: 'analysis.failed',
      payload: { analysisId: job.analysisId, error: message.slice(0, 500), attempts: nextAttempts },
    });
    log(runnerId, `analysis=${job.analysisId} окончательно failed после ${nextAttempts} попыток`);
    return 'failed';
  }

  // Мягкий провал: снимаем лок, следующий прогон попробует снова.
  await db
    .update(analysisJobs)
    .set({
      attempts: nextAttempts,
      lockedAt: null,
      lockedBy: null,
      lastError: message.slice(0, 500),
    })
    .where(eq(analysisJobs.id, job.jobId));
  await db.update(analyses).set({ status: 'queued' }).where(eq(analyses.id, job.analysisId));
  return 'requeued';
}

/**
 * Переносит в таблицу repositories то, что узнали при сборе фактов.
 * Пустые значения не пишем: сбой API не должен затирать уже известное.
 */
async function syncRepositoryFromFacts(
  db: AnalysisDb,
  repositoryId: string,
  facts: RepoFacts,
): Promise<void> {
  const patch: Record<string, unknown> = { lastSyncedAt: new Date() };
  if (facts.language) patch.language = facts.language;
  if (facts.repository?.description) patch.description = facts.repository.description;
  if (facts.defaultBranch) patch.defaultBranch = facts.defaultBranch;
  if (facts.cloneUrl.https) patch.cloneUrl = facts.cloneUrl.https;
  if (facts.webUrl) patch.webUrl = facts.webUrl;
  if (facts.counters.forks !== null) patch.forksCount = facts.counters.forks;

  await db.update(repositories).set(patch).where(eq(repositories.id, repositoryId));
}

function log(runnerId: string, message: string): void {
  console.log(`[analysis ${runnerId}] ${message}`);
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function withTimeout<T>(promise: Promise<T>, ms: number, tag: string): Promise<T> {
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error(tag)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      },
      (err) => {
        clearTimeout(timer);
        rejectPromise(err);
      },
    );
  });
}
