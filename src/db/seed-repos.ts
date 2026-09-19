// Ставит в очередь на анализ N репозиториев из seeds/repos.json.
//
// Флаги:
//   --auto   заполнить seeds/repos.json пятью первыми публичными репо через
//            SourceCraft API (метод discoverRepositories). Требует SOURCECRAFT_PAT.
//   --count=N  сколько репо взять при --auto (по умолчанию 5).
//
// Использование:
//   pnpm seed:repos               — читает seeds/repos.json и ставит в очередь
//   pnpm seed:repos --auto        — сначала заполнит seeds/repos.json, потом поставит
//   pnpm seed:repos --auto --count=10

import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getWorkerDb, shutdownWorkerDb } from './worker-client';
import { analysisJobs, analyses, repositories } from './schema';
import { getSourcecraftClient } from '../lib/sourcecraft/client';

const seedsPath = resolve(process.cwd(), 'seeds/repos.json');

const seedsSchema = z.object({
  repos: z.array(
    z.object({
      org: z.string().min(1),
      repo: z.string().min(1),
    }),
  ),
});

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const auto = args.has('--auto');
  const countArg = [...args].find((a) => a.startsWith('--count='));
  const count = countArg ? Number.parseInt(countArg.slice('--count='.length), 10) || 5 : 5;

  if (auto) {
    await bootstrapSeedsFile(count);
  }

  const seeds = await readSeeds();
  if (seeds.length === 0) {
    console.error(
      'seeds/repos.json пуст. Запустите `pnpm seed:repos --auto`, чтобы подтянуть 5 репо из вашего SourceCraft-аккаунта.',
    );
    process.exit(2);
  }

  console.log(`Ставим в очередь ${seeds.length} репозиториев ...`);
  const db = getWorkerDb();

  for (const { org, repo } of seeds) {
    const existing = await db.query.repositories.findFirst({
      where: and(eq(repositories.orgSlug, org), eq(repositories.repoSlug, repo)),
    });

    let repositoryId: string;
    if (existing) {
      repositoryId = existing.id;
    } else {
      const [inserted] = await db
        .insert(repositories)
        .values({ orgSlug: org, repoSlug: repo })
        .returning({ id: repositories.id });
      if (!inserted) throw new Error(`insert repositories вернул пусто (${org}/${repo})`);
      repositoryId = inserted.id;
    }

    const [analysis] = await db
      .insert(analyses)
      .values({ repositoryId, status: 'queued' })
      .returning({ id: analyses.id });
    if (!analysis) throw new Error(`insert analyses вернул пусто (${org}/${repo})`);

    await db.insert(analysisJobs).values({ analysisId: analysis.id });
    console.log(`  + ${org}/${repo} → analysis=${analysis.id}`);
  }

  await shutdownWorkerDb();
  console.log('Готово.');
}

async function readSeeds(): Promise<Array<{ org: string; repo: string }>> {
  try {
    const raw = await readFile(seedsPath, 'utf8');
    const data = JSON.parse(raw) as unknown;
    const parsed = seedsSchema.safeParse(data);
    if (!parsed.success) {
      console.error('seeds/repos.json невалиден:', parsed.error.message);
      process.exit(2);
    }
    return parsed.data.repos;
  } catch {
    return [];
  }
}

async function bootstrapSeedsFile(count: number): Promise<void> {
  console.log(`Тяну ${count} репозиториев из /repos (SourceCraft) для seed ...`);
  const client = getSourcecraftClient();
  const collected: Array<{ org: string; repo: string }> = [];

  for await (const item of client.paginate(
    (p) => client.discoverRepositories({ ...p, sortBy: '-counters.forks' }),
    'repositories',
    50,
  )) {
    const org = item.organization?.slug;
    const slug = item.slug;
    const visibility = item.visibility;
    if (!org || !slug) continue;
    if (visibility && visibility !== 'public') continue;
    collected.push({ org, repo: slug });
    if (collected.length >= count) break;
  }

  if (collected.length === 0) {
    console.error(
      'Не удалось найти ни одного публичного репозитория через API. Заполните seeds/repos.json вручную.',
    );
    process.exit(2);
  }

  const payload = {
    $comment:
      'Автозаполнено `pnpm seed:repos --auto`. Правьте руками, если нужны конкретные репозитории.',
    repos: collected,
  };
  await writeFile(seedsPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Записано ${collected.length} записей в ${seedsPath}`);
}

main().catch(async (err: unknown) => {
  console.error('Ошибка seed:repos:', err);
  await shutdownWorkerDb().catch(() => undefined);
  process.exit(1);
});
