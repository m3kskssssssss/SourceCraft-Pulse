// Догрузка сводки ревью PR в уже посчитанные публичные анализы.
//
//   pnpm backfill:reviews              — все, что ждут
//   pnpm backfill:reviews --dry-run    — только посчитать, сколько их
//
// Только API SourceCraft, без клона и ИИ; балл не меняется (lib/backfill.ts).
// На сервере то же самое делает /api/cron/backfill. Требует DATABASE_URL и
// SOURCECRAFT_PAT.

import 'dotenv/config';
import { getWorkerDb, shutdownWorkerDb } from './worker-client';
import { backfillReviews, pendingBackfill } from '../lib/backfill';

async function main(): Promise<void> {
  const db = getWorkerDb();
  const pending = await pendingBackfill(db);
  console.log(`Публичных анализов без сводки ревью: ${pending.reviews}.`);
  if (process.argv.includes('--dry-run') || pending.reviews === 0) return shutdownWorkerDb();

  const started = Date.now();
  let filled = 0;
  let failed = 0;
  // Порциями по 200, пока выборка не опустеет или не перестанет убывать.
  for (let round = 0; round < 50; round += 1) {
    const r = await backfillReviews(db, {
      deadline: Date.now() + 60 * 60 * 1000,
      limit: 200,
      onProgress: (done, total) => {
        if (done % 25 === 0) console.log(`  ${done}/${total}, ${Math.round((Date.now() - started) / 1000)} с`);
      },
    });
    filled += r.filled;
    failed += r.failed;
    if (r.processed === 0 || r.remaining === 0) break;
  }
  console.log(`Готово: заполнено ${filled}, не вышло ${failed} (повтор через сутки), ${Math.round((Date.now() - started) / 1000)} с.`);
  await shutdownWorkerDb();
}

main().catch(async (err: unknown) => {
  console.error('Ошибка backfill:reviews:', err);
  await shutdownWorkerDb().catch(() => undefined);
  process.exit(1);
});
