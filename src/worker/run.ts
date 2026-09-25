// Воркер очереди анализа: обычный Node-процесс (pnpm worker).
//
// На Vercel основной путь другой — анализ считается прямо в запросе
// /api/analyses/<id>/run. Воркер остаётся для двух случаев:
//   - локальный прогон очереди без поднятого приложения;
//   - добор задач, брошенных упавшей функцией (лок старше шести минут).
//
// Что делает:
//   1) берёт из analysis_jobs пачку задач через SELECT ... FOR UPDATE SKIP LOCKED
//      + UPDATE locked_at/locked_by, всё в одной транзакции;
//   2) считает их параллельно (WORKER_CONCURRENCY), пока есть задачи и время;
//   3) пока считает — обновляет locked_at взятым задачам, иначе долгий анализ
//      сам себя объявит брошенным и его подхватит второй воркер;
//   4) закрывает пул и выходит, напечатав итог.
//
// Перед очередью ставит суточный пересчёт своих репозиториев (lib/ownership.ts),
// если наступили новые сутки.
//
// Настройки через окружение:
//   WORKER_BATCH_SIZE   — сколько задач захватывать за раз (по умолчанию 6);
//   WORKER_CONCURRENCY  — сколько считать одновременно (по умолчанию 3);
//   WORKER_MAX_SECONDS  — общий бюджет времени (по умолчанию 900).

import 'dotenv/config';
import { hostname } from 'node:os';
import { getWorkerDb, getWorkerPool, shutdownWorkerDb } from '../db/worker-client';
import { MAX_ATTEMPTS, processAnalysis, type ClaimedJob, type ProcessOutcome } from '../lib/analysis/run';
import { enqueueDailyRefresh } from '../lib/ownership';

const DEFAULT_BATCH_SIZE = 6;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_SECONDS = 900;
/** Как часто продлеваем лок взятых задач. */
const HEARTBEAT_MS = 60_000;
/** Лок, который старше этого, считаем брошенным — см. STALE_LOCK_MS в lib/analysis/run. */
const STALE_LOCK_SQL = `now() - interval '6 minutes'`;

const workerId = `${hostname()}#${process.pid}`;

/** Задачи, которые прямо сейчас в работе: их локи продлевает heartbeat. */
const inFlight = new Set<string>();

async function main(): Promise<void> {
  const batchSize = envInt('WORKER_BATCH_SIZE', DEFAULT_BATCH_SIZE);
  const concurrency = envInt('WORKER_CONCURRENCY', DEFAULT_CONCURRENCY);
  const budgetMs = envInt('WORKER_MAX_SECONDS', DEFAULT_MAX_SECONDS) * 1000;
  const deadline = Date.now() + budgetMs;

  console.log(
    `[worker ${workerId}] Стартуем: пачка до ${batchSize}, одновременно ${concurrency}, бюджет ${Math.round(budgetMs / 1000)} с.`,
  );

  const db = getWorkerDb();

  // Суточный пересчёт своих репозиториев. Воркер в docker запускается раз в
  // минуту, так что первый запуск после полуночи и ставит прогоны; остальные
  // в те же сутки ничего не делают.
  try {
    const refresh = await enqueueDailyRefresh(db);
    if (refresh.queued > 0) {
      console.log(`[worker ${workerId}] Суточный пересчёт ${refresh.day}: в очереди ${refresh.queued}.`);
    }
  } catch (err) {
    console.warn(`[worker ${workerId}] Суточный пересчёт не встал: ${describe(err)}`);
  }

  const heartbeat = setInterval(() => {
    void touchLocks();
  }, HEARTBEAT_MS);

  const totals: Record<ProcessOutcome, number> = { done: 0, failed: 0, requeued: 0 };
  const started = Date.now();

  try {
    for (;;) {
      if (Date.now() >= deadline) {
        console.log(`[worker ${workerId}] Бюджет времени вышел.`);
        break;
      }

      const jobs = await lockNextBatch(batchSize);
      if (jobs.length === 0) break;
      console.log(`[worker ${workerId}] Захвачено задач: ${jobs.length}`);

      const queue = [...jobs];
      await Promise.all(
        Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
          for (;;) {
            const job = queue.shift();
            if (!job) return;
            if (Date.now() >= deadline) {
              // Время вышло — лок снимаем, задачу подберёт следующий прогон.
              await releaseJob(job.jobId);
              continue;
            }
            inFlight.add(job.jobId);
            try {
              const outcome = await processAnalysis(db, job, workerId);
              totals[outcome] += 1;
            } finally {
              inFlight.delete(job.jobId);
            }
          }
        }),
      );
    }
  } finally {
    clearInterval(heartbeat);
  }

  const elapsed = Math.round((Date.now() - started) / 1000);
  console.log(
    `[worker ${workerId}] Готово за ${elapsed} с: посчитано ${totals.done}, упало ${totals.failed}, вернулось в очередь ${totals.requeued}.`,
  );
  await shutdownWorkerDb();
}

async function lockNextBatch(batchSize: number): Promise<ClaimedJob[]> {
  const pool = getWorkerPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: string; analysis_id: string; attempts: number }>(
      `SELECT id, analysis_id, attempts
       FROM analysis_jobs
       WHERE (locked_at IS NULL OR locked_at < ${STALE_LOCK_SQL}) AND attempts < $1
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
    return res.rows.map((r) => ({
      jobId: r.id,
      analysisId: r.analysis_id,
      attempts: r.attempts,
    }));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Продлевает локи задач, которые считаются прямо сейчас. */
async function touchLocks(): Promise<void> {
  if (inFlight.size === 0) return;
  try {
    await getWorkerPool().query(
      `UPDATE analysis_jobs SET locked_at = now() WHERE id = ANY($1) AND locked_by = $2`,
      [[...inFlight], workerId],
    );
  } catch (err) {
    console.warn(`[worker ${workerId}] Лок не продлился: ${describe(err)}`);
  }
}

/** Снимает лок с задачи, до которой не дошли руки. */
async function releaseJob(jobId: string): Promise<void> {
  try {
    await getWorkerPool().query(
      `UPDATE analysis_jobs SET locked_at = NULL, locked_by = NULL WHERE id = $1 AND locked_by = $2`,
      [jobId, workerId],
    );
  } catch {
    // не страшно: лок протухнет сам через шесть минут
  }
}

function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

main().catch(async (err: unknown) => {
  console.error('[worker] fatal:', err);
  await shutdownWorkerDb().catch(() => undefined);
  process.exit(1);
});
