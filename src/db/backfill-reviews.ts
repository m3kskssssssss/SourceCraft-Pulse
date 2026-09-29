// Догрузка сводки ревью PR в уже посчитанные публичные анализы.
//
//   pnpm backfill:reviews              — все публичные анализы без сводки
//   pnpm backfill:reviews --limit=50   — не больше 50 за запуск
//   pnpm backfill:reviews --dry-run    — только посчитать, сколько их
//
// Без клона и без ИИ: по сохранённой в фактах выборке PR берём комментарии
// через API SourceCraft (lib/extra-analytics.ts, ensureReviewStats) и пишем
// в metrics.reviews — то же, что делает отчёт при первом открытии. Балл не
// меняется: ревью — дополнительная аналитика вне оценки.
//
// Требует DATABASE_URL и SOURCECRAFT_PAT. Приватные репозитории пропускает:
// их комментарии доступны только по токену владельца.

import 'dotenv/config';
import { and, eq, sql } from 'drizzle-orm';
import { analyses, repositories } from './schema';
import { getWorkerDb, shutdownWorkerDb } from './worker-client';
import { ensureReviewStats } from '../lib/extra-analytics';

/** Параллельно: API SourceCraft и так режет запросы до 8 в секунду. */
const CONCURRENCY = 2;

function argValue(name: string): string | null {
  const arg = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
}

async function main(): Promise<void> {
  const limit = Number.parseInt(argValue('limit') ?? '', 10) || 10_000;
  const dryRun = process.argv.includes('--dry-run');
  const db = getWorkerDb();

  // Сводки нет ни в фактах (новые анализы), ни в metrics.reviews (догружено).
  const rows = await db
    .select({ analysis: analyses, repository: repositories })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(
      and(
        eq(analyses.isPublic, true),
        eq(analyses.status, 'done'),
        eq(repositories.isPrivate, false),
        sql`coalesce((${analyses.metrics} -> 'facts' -> 'reviews' ->> 'available')::boolean, false) = false`,
        sql`coalesce((${analyses.metrics} -> 'reviews' ->> 'available')::boolean, false) = false`,
        sql`jsonb_typeof(${analyses.metrics} -> 'facts' -> 'pullRequests') = 'array'`,
      ),
    )
    .limit(limit);

  console.log(`Публичных анализов без сводки ревью: ${rows.length}.`);
  if (dryRun || rows.length === 0) {
    await shutdownWorkerDb();
    return;
  }

  const started = Date.now();
  let done = 0;
  let filled = 0;
  let queue = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue < rows.length) {
        const row = rows[queue++];
        if (!row) break;
        const slug = `${row.repository.orgSlug}/${row.repository.repoSlug}`;
        try {
          const stats = await ensureReviewStats(db, row.analysis, row.repository);
          if (stats?.available) filled += 1;
          else console.log(`  ${slug}: сводку не собрать (нет PR или API не ответил)`);
        } catch (err) {
          console.warn(`  ${slug}: ошибка — ${err instanceof Error ? err.message : String(err)}`);
        }
        done += 1;
        if (done % 25 === 0) {
          console.log(`  ${done}/${rows.length}, заполнено ${filled}, ${Math.round((Date.now() - started) / 1000)} с`);
        }
      }
    }),
  );

  console.log(`Готово: ${filled} из ${rows.length} за ${Math.round((Date.now() - started) / 1000)} с.`);
  await shutdownWorkerDb();
}

main().catch(async (err: unknown) => {
  console.error('Ошибка backfill:reviews:', err);
  await shutdownWorkerDb().catch(() => undefined);
  process.exit(1);
});
