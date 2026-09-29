// Досчёт пустых коммитов в уже посчитанных публичных анализах.
//
//   pnpm backfill:empty-commits              — все, что ждут
//   pnpm backfill:empty-commits --dry-run    — только посчитать, сколько их
//
// Клон истории за 90 дней, без ИИ и чтения файлов; балл не меняется — пустые
// коммиты войдут в активность при следующей переоценке (lib/backfill.ts).
// На сервере то же самое делает /api/cron/backfill. Требует DATABASE_URL и
// SOURCECRAFT_PAT.

import 'dotenv/config';
import { getWorkerDb, shutdownWorkerDb } from './worker-client';
import { backfillEmptyCommits, pendingBackfill } from '../lib/backfill';

async function main(): Promise<void> {
  const db = getWorkerDb();
  const pending = await pendingBackfill(db);
  console.log(`Публичных анализов без подсчёта пустых коммитов: ${pending.emptyCommits}.`);
  if (process.argv.includes('--dry-run') || pending.emptyCommits === 0) return shutdownWorkerDb();

  const started = Date.now();
  let filled = 0;
  let failed = 0;
  for (let round = 0; round < 50; round += 1) {
    const r = await backfillEmptyCommits(db, {
      deadline: Date.now() + 60 * 60 * 1000,
      limit: 100,
      onProgress: (done, total) => {
        if (done % 20 === 0) console.log(`  ${done}/${total}, ${Math.round((Date.now() - started) / 1000)} с`);
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
  console.error('Ошибка backfill:empty-commits:', err);
  await shutdownWorkerDb().catch(() => undefined);
  process.exit(1);
});
