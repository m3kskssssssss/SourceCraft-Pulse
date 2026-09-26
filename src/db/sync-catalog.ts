// Обход каталога публичных репозиториев SourceCraft из командной строки.
//
//   pnpm catalog:sync               — обойти каталог целиком
//   pnpm catalog:sync --enqueue=20  — и поставить на оценку 20 ещё не оценённых
//
// Требует DATABASE_URL и SOURCECRAFT_PAT.

import 'dotenv/config';
import { getWorkerDb, shutdownWorkerDb } from './worker-client';
import { enqueueCatalogAnalyses, getCatalogStats, syncCatalog } from '../lib/catalog';

async function main(): Promise<void> {
  const enqueueArg = process.argv.slice(2).find((a) => a.startsWith('--enqueue='));
  const enqueue = enqueueArg ? Number.parseInt(enqueueArg.slice('--enqueue='.length), 10) || 0 : 0;
  const db = getWorkerDb();

  const started = Date.now();
  const sync = await syncCatalog(db, {
    onPage: (page, seen) => {
      if (page % 25 === 0) console.log(`  страниц ${page}, репозиториев ${seen}`);
    },
  });
  console.log(
    `Каталог: ${sync.seen} публичных репозиториев за ${sync.pages} страниц, ${Math.round((Date.now() - started) / 1000)} с; удалено исчезнувших: ${sync.removed}.`,
  );

  const stats = await getCatalogStats(db);
  if (stats) {
    console.log(`Могут попасть в рейтинг: ${stats.eligible}; уже оценено и опубликовано: ${stats.analyzed}.`);
  }

  if (enqueue > 0) {
    const queued = await enqueueCatalogAnalyses(db, enqueue);
    console.log(`Поставлено на оценку: ${queued}. Считает воркер: pnpm worker.`);
  }
  await shutdownWorkerDb();
}

main().catch(async (err: unknown) => {
  console.error('Ошибка catalog:sync:', err);
  await shutdownWorkerDb().catch(() => undefined);
  process.exit(1);
});
