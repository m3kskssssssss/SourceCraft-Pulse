// Досчёт пустых коммитов в уже посчитанных публичных анализах.
//
//   pnpm backfill:empty-commits              — все публичные анализы без поля
//   pnpm backfill:empty-commits --limit=50   — не больше 50 за запуск
//   pnpm backfill:empty-commits --dry-run    — только посчитать, сколько их
//
// Без ИИ и без чтения файлов: клон истории за 90 дней, лог коммитов и
// countEmptyCommits (lib/git/stats.ts) — ровно как в анализе. Число пишется
// в metrics.facts.gitHistory.emptyCommitsLast90Days, и блок «Дополнительная
// аналитика» перестаёт показывать «нет данных». Балл не пересчитывается:
// для этого понадобились бы заново вызовы модели. Пустые коммиты войдут в
// метрику активности при следующем плановом пересчёте.
//
// Требует DATABASE_URL и SOURCECRAFT_PAT. Приватные репозитории пропускает,
// большие (5000+ записей в дереве) — тоже: их анализ шёл по верхушке без
// истории, и досчитывать нечего.

import 'dotenv/config';
import { and, eq, sql } from 'drizzle-orm';
import { analyses, repositories } from './schema';
import { getWorkerDb, shutdownWorkerDb } from './worker-client';
import { withRepoClone } from '../lib/git/clone';
import { readCloneCommits } from '../lib/git/commits';
import { countEmptyCommits } from '../lib/git/stats';

/** Одновременных клонов: каждый — сеть и временный каталог. */
const CONCURRENCY = 3;
/** Столько же коммитов читает анализ (COMMIT_LIMIT в lib/collect.ts). */
const COMMIT_LIMIT = 2_000;
/** Порог большого репозитория (BIG_REPO_TREE_ENTRIES в lib/collect.ts). */
const BIG_REPO_TREE_ENTRIES = 5_000;
/** На один репозиторий: клон истории за 90 дней небольшого репозитория. */
const CLONE_TIMEOUT_MS = 60_000;

function argValue(name: string): string | null {
  const arg = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
}

type Row = {
  id: string;
  org: string;
  repo: string;
  cloneUrl: string | null;
  factsCloneUrl: string | null;
};

async function main(): Promise<void> {
  const limit = Number.parseInt(argValue('limit') ?? '', 10) || 10_000;
  const dryRun = process.argv.includes('--dry-run');
  const db = getWorkerDb();

  const rows: Row[] = await db
    .select({
      id: analyses.id,
      org: repositories.orgSlug,
      repo: repositories.repoSlug,
      cloneUrl: repositories.cloneUrl,
      factsCloneUrl: sql<string | null>`${analyses.metrics} -> 'facts' -> 'cloneUrl' ->> 'https'`,
    })
    .from(analyses)
    .innerJoin(repositories, eq(analyses.repositoryId, repositories.id))
    .where(
      and(
        eq(analyses.isPublic, true),
        eq(analyses.status, 'done'),
        eq(repositories.isPrivate, false),
        // История в анализе была, а поля пустых коммитов ещё нет.
        sql`(${analyses.metrics} -> 'facts' -> 'gitHistory' ->> 'available') = 'true'`,
        sql`(${analyses.metrics} -> 'facts' -> 'gitHistory' ->> 'commitsLast90Days') is not null`,
        sql`not ((${analyses.metrics} -> 'facts' -> 'gitHistory') ? 'emptyCommitsLast90Days')`,
        sql`coalesce((${analyses.metrics} -> 'facts' -> 'tree' ->> 'entriesCount')::int, 0) < ${BIG_REPO_TREE_ENTRIES}`,
      ),
    )
    .limit(limit);

  console.log(`Публичных анализов без подсчёта пустых коммитов: ${rows.length}.`);
  if (dryRun || rows.length === 0) {
    await shutdownWorkerDb();
    return;
  }

  const token = process.env.SOURCECRAFT_PAT || undefined;
  const started = Date.now();
  let done = 0;
  let filled = 0;
  let found = 0;
  let queue = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue < rows.length) {
        const row = rows[queue++];
        if (!row) break;
        const slug = `${row.org}/${row.repo}`;
        const cloneUrl = row.factsCloneUrl ?? row.cloneUrl;
        try {
          if (!cloneUrl) throw new Error('нет адреса клона');
          const empty = await withRepoClone(
            { cloneUrlHttps: cloneUrl, token, strategy: 'window', totalTimeoutMs: CLONE_TIMEOUT_MS },
            async (clone) => (clone.tipOnly ? null : countEmptyCommits(await readCloneCommits(clone, COMMIT_LIMIT))),
          );
          if (empty === null) {
            console.log(`  ${slug}: истории не досталось — пропускаем`);
          } else {
            await db
              .update(analyses)
              .set({
                metrics: sql`jsonb_set(${analyses.metrics}, '{facts,gitHistory,emptyCommitsLast90Days}', ${String(empty)}::jsonb, true)`,
              })
              .where(eq(analyses.id, row.id));
            filled += 1;
            if (empty > 0) {
              found += 1;
              console.log(`  ${slug}: пустых коммитов за 90 дней — ${empty}`);
            }
          }
        } catch (err) {
          console.warn(`  ${slug}: ошибка — ${err instanceof Error ? err.message : String(err)}`);
        }
        done += 1;
        if (done % 20 === 0) {
          console.log(`  ${done}/${rows.length}, заполнено ${filled}, ${Math.round((Date.now() - started) / 1000)} с`);
        }
      }
    }),
  );

  console.log(
    `Готово: заполнено ${filled} из ${rows.length}, с пустыми коммитами — ${found}, за ${Math.round((Date.now() - started) / 1000)} с.`,
  );
  await shutdownWorkerDb();
}

main().catch(async (err: unknown) => {
  console.error('Ошибка backfill:empty-commits:', err);
  await shutdownWorkerDb().catch(() => undefined);
  process.exit(1);
});
