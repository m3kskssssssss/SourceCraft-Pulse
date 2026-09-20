// Воркер очереди анализа. Запускается обычным Node-процессом
// (pnpm worker вручную либо GitHub Actions workflow_dispatch).
//
// Что делает:
//   1) Берёт из analysis_jobs пачку задач через SELECT ... FOR UPDATE SKIP LOCKED
//      + UPDATE locked_at/locked_by, всё внутри одной транзакции.
//   2) Для каждой задачи вызывает collectRepoFacts, пишет факты в analyses.metrics
//      и переводит статус в 'done'. Если упало — attempts++, снимает лок, ставит
//      last_error. После MAX_ATTEMPTS попыток статус переводится в 'failed'.
//   3) В конце закрывает пул и завершает процесс.
//
// На Этапе 3 (движок оценки) сюда добавится расчёт score и запись category_scores/recommendations.

import 'dotenv/config';
import { and, eq, isNull, sql, inArray } from 'drizzle-orm';
import { hostname } from 'node:os';
import { getWorkerDb, getWorkerPool, shutdownWorkerDb } from '../db/worker-client';
import { analyses, analysisJobs, repositories, events } from '../db/schema';
import { collectRepoFacts } from '../lib/collect';
import { scoreRepo } from '../lib/scoring';

const DEFAULT_BATCH_SIZE = 5;
const MAX_ATTEMPTS = 3;
const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 минут на одну задачу

const workerId = `${hostname()}#${process.pid}`;

type LockedJob = {
  jobId: string;
  analysisId: string;
  attempts: number;
};

async function main(): Promise<void> {
  const batchSize = Number.parseInt(process.env.WORKER_BATCH_SIZE ?? '', 10) || DEFAULT_BATCH_SIZE;

  console.log(`[worker ${workerId}] Стартуем, пачка до ${batchSize} задач.`);
  const jobs = await lockNextBatch(batchSize);
  console.log(`[worker ${workerId}] Захвачено задач: ${jobs.length}`);

  for (const job of jobs) {
    await processJob(job);
  }

  await shutdownWorkerDb();
  console.log(`[worker ${workerId}] Готово.`);
}

async function lockNextBatch(batchSize: number): Promise<LockedJob[]> {
  const pool = getWorkerPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: string; analysis_id: string; attempts: number }>(
      `SELECT id, analysis_id, attempts
       FROM analysis_jobs
       WHERE locked_at IS NULL AND attempts < $1
       ORDER BY created_at ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED`,
      [MAX_ATTEMPTS, batchSize],
    );
    if (res.rows.length === 0) {
      await client.query('COMMIT');
      return [];
    }
    const ids = res.rows.map((r) => r.id);
    await client.query(`UPDATE analysis_jobs SET locked_at = now(), locked_by = $1 WHERE id = ANY($2)`, [
      workerId,
      ids,
    ]);
    await client.query('COMMIT');
    return res.rows.map((r) => ({ jobId: r.id, analysisId: r.analysis_id, attempts: r.attempts }));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

async function processJob(job: LockedJob): Promise<void> {
  const db = getWorkerDb();
  console.log(`[worker ${workerId}] → job=${job.jobId} analysis=${job.analysisId}`);

  await db
    .update(analyses)
    .set({ status: 'running' })
    .where(eq(analyses.id, job.analysisId));

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.id, job.analysisId),
  });
  if (!analysis) {
    await failJob(job, 'analysis_row_missing');
    return;
  }
  const repo = await db.query.repositories.findFirst({
    where: eq(repositories.id, analysis.repositoryId),
  });
  if (!repo) {
    await failJob(job, 'repository_row_missing');
    return;
  }

  try {
    const facts = await withTimeout(
      collectRepoFacts(repo.orgSlug, repo.repoSlug),
      JOB_TIMEOUT_MS,
      `job_timeout_${JOB_TIMEOUT_MS}ms`,
    );

    const result = scoreRepo(facts);

    await db
      .update(analyses)
      .set({
        status: 'done',
        score: result.score,
        categoryScores: result.categoryScores as unknown as Record<string, unknown>,
        metrics: {
          facts: facts as unknown as Record<string, unknown>,
          penalties: result.penalties,
          scoreBeforePenalties: result.scoreBeforePenalties,
        },
        recommendations: result.recommendations as unknown as Record<string, unknown>,
        missing: result.missing as unknown as Record<string, unknown>,
        finishedAt: new Date(),
      })
      .where(eq(analyses.id, job.analysisId));

    // задачу считаем выполненной — удаляем строку из очереди
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

    console.log(
      `[worker ${workerId}] ✓ analysis=${job.analysisId} done, score=${result.score}, missing=${result.missing.length}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[worker ${workerId}] ✗ analysis=${job.analysisId} failed: ${message}`);
    await failJob(job, message);
  }
}

async function failJob(job: LockedJob, message: string): Promise<void> {
  const db = getWorkerDb();
  const nextAttempts = job.attempts + 1;

  if (nextAttempts >= MAX_ATTEMPTS) {
    // финальный провал — статус failed, из очереди убираем
    await db
      .update(analyses)
      .set({ status: 'failed', error: message.slice(0, 500), finishedAt: new Date() })
      .where(eq(analyses.id, job.analysisId));
    await db.delete(analysisJobs).where(eq(analysisJobs.id, job.jobId));
    await db.insert(events).values({
      kind: 'analysis.failed',
      payload: { analysisId: job.analysisId, error: message.slice(0, 500), attempts: nextAttempts },
    });
    return;
  }

  // мягкий провал — освобождаем лок, чтобы следующая пачка попробовала снова
  await db
    .update(analysisJobs)
    .set({
      attempts: nextAttempts,
      lockedAt: null,
      lockedBy: null,
      lastError: message.slice(0, 500),
    })
    .where(eq(analysisJobs.id, job.jobId));
  await db
    .update(analyses)
    .set({ status: 'queued' })
    .where(eq(analyses.id, job.analysisId));
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

// Namespace guard — импорты, чтобы линтер не считал их unused при рефакторе.
void and;
void isNull;
void sql;
void inArray;

main().catch(async (err: unknown) => {
  console.error('[worker] fatal:', err);
  await shutdownWorkerDb().catch(() => undefined);
  process.exit(1);
});
