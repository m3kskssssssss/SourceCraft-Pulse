// Досчитать ждущие прогоны своих репозиториев в пределах времени запроса.
//
// Нужно cron-маршрутам на Vercel: отдельного воркера там нет, и прогоны,
// поставленные суточным пересчётом или синхронизацией по токену, иначе так и
// висели бы в очереди. В docker их подбирает воркер, эта функция не нужна.

import { db } from '@/db/client';
import { claimJobForAnalysis, processAnalysis, type ProcessOutcome } from '@/lib/analysis/run';
import { listQueuedOwnerAnalyses } from '@/lib/ownership';

/** Новый прогон начинаем, только если до дедлайна осталось больше этого. */
const MIN_LEFT_MS = 90_000;

export async function processQueuedOwnerAnalyses(
  deadline: number,
  runner: string,
): Promise<Record<ProcessOutcome, number> & { left: number }> {
  const totals = { done: 0, failed: 0, requeued: 0, left: 0 };
  for (const id of await listQueuedOwnerAnalyses(db)) {
    if (deadline - Date.now() < MIN_LEFT_MS) {
      totals.left += 1;
      continue;
    }
    const job = await claimJobForAnalysis(db, id, runner);
    if (!job) continue;
    totals[await processAnalysis(db, job, runner)] += 1;
  }
  return totals;
}
