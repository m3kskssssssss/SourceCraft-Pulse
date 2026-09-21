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
//   2) на каждую вызывает processAnalysis (общий код с маршрутом);
//   3) закрывает пул и выходит.

import 'dotenv/config';
import { hostname } from 'node:os';
import { getWorkerDb, getWorkerPool, shutdownWorkerDb } from '../db/worker-client';
import { MAX_ATTEMPTS, processAnalysis, type ClaimedJob } from '../lib/analysis/run';

const DEFAULT_BATCH_SIZE = 5;
/** Лок, который старше этого, считаем брошенным — см. STALE_LOCK_MS в lib/analysis/run. */
const STALE_LOCK_SQL = `now() - interval '6 minutes'`;

const workerId = `${hostname()}#${process.pid}`;

async function main(): Promise<void> {
  const batchSize = Number.parseInt(process.env.WORKER_BATCH_SIZE ?? '', 10) || DEFAULT_BATCH_SIZE;

  console.log(`[worker ${workerId}] Стартуем, пачка до ${batchSize} задач.`);
  const jobs = await lockNextBatch(batchSize);
  console.log(`[worker ${workerId}] Захвачено задач: ${jobs.length}`);

  const db = getWorkerDb();
  for (const job of jobs) {
    await processAnalysis(db, job, workerId);
  }

  await shutdownWorkerDb();
  console.log(`[worker ${workerId}] Готово.`);
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

main().catch(async (err: unknown) => {
  console.error('[worker] fatal:', err);
  await shutdownWorkerDb().catch(() => undefined);
  process.exit(1);
});
