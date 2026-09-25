// «Мои репозитории»: заявить репозиторий своим, подтвердить и забрать
// бейдж-карточку, которая пересчитывается каждый день в 00:00.
//
// Подтверждение — личным токеном SourceCraft (lib/token-ownership.ts) или
// ключом в описании либо файлом в корне (lib/ownership.ts).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { analyses, ownedRepositories, repositories } from '@/db/schema';
import { removeOwnedRepoAction } from '@/app/actions/repos';
import {
  AddOwnedRepoForm,
  CardBadgeMarkdown,
  CopyField,
  TokenImport,
  VerifyOwnedRepo,
} from '@/app/components/OwnedRepos';
import { ConfirmSubmit } from '@/app/components/ConfirmSubmit';
import { CardDiv, Chip, EmptyState } from '@/app/components/ui';
import { refreshTimeZone } from '@/lib/ownership';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  queued: 'в очереди',
  running: 'считается',
  done: 'готово',
  failed: 'ошибка',
};

export default async function MyRepositoriesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/signin');

  const rows = await db
    .select({ owned: ownedRepositories, repo: repositories })
    .from(ownedRepositories)
    .innerJoin(repositories, eq(ownedRepositories.repositoryId, repositories.id))
    .where(eq(ownedRepositories.userId, userId))
    .orderBy(desc(ownedRepositories.createdAt));

  // Последний прогон каждого репозитория — показать статус и балл. Список
  // короткий (до двадцати), так что берём всё и выбираем первый по дате.
  const repoIds = rows.map((r) => r.repo.id);
  const latestRuns = repoIds.length
    ? await db
        .select({
          id: analyses.id,
          repositoryId: analyses.repositoryId,
          status: analyses.status,
          score: analyses.score,
          finishedAt: analyses.finishedAt,
        })
        .from(analyses)
        .where(inArray(analyses.repositoryId, repoIds))
        .orderBy(desc(analyses.createdAt))
        .limit(repoIds.length * 10)
    : [];
  const latestByRepo = new Map<string, (typeof latestRuns)[number]>();
  for (const run of latestRuns) {
    if (!latestByRepo.has(run.repositoryId)) latestByRepo.set(run.repositoryId, run);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-14">
      <header className="rise">
        <Chip tone="outline">Свои репозитории</Chip>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Мои репозитории</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Подтвердите ключом, что репозиторий ваш, — и Pulse будет пересчитывать его каждый день
          в 00:00 ({refreshTimeZone()}). Бейдж-карточка для README всегда покажет свежую оценку.
        </p>
      </header>

      <CardDiv className="rise mt-8" tone="outline">
        <h2 className="text-base font-semibold">Подтвердить личным токеном SourceCraft</h2>
        <p className="mb-4 mt-1 text-sm text-[color:var(--muted)]">
          Покажем ваши репозитории и вашу роль в каждом — admin и maintainer подтверждаются сразу.
          Хватит токена только на чтение. Мы его не сохраняем: он нужен на время этих двух запросов.
        </p>
        <TokenImport />
      </CardDiv>

      <CardDiv className="rise mt-4" tone="outline">
        <h2 className="text-base font-semibold">Или добавить вручную и подтвердить ключом</h2>
        <p className="mb-4 mt-1 text-sm text-[color:var(--muted)]">
          Если репозиторий не нашёлся по токену или права выданы на уровне организации. Только
          публичные репозитории SourceCraft.
        </p>
        <AddOwnedRepoForm />
      </CardDiv>

      <section className="mt-8 flex flex-col gap-4">
        {rows.length === 0 ? (
          <EmptyState
            title="Пока пусто"
            hint="Добавьте репозиторий выше — мы выдадим ключ для подтверждения."
          />
        ) : (
          rows.map(({ owned, repo }) => {
            const slug = `${repo.orgSlug}/${repo.repoSlug}`;
            const latest = latestByRepo.get(repo.id);
            return (
              <CardDiv key={owned.id} tone="outline" className="rise flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/r/${repo.orgSlug}/${repo.repoSlug}`}
                      className="text-lg font-semibold [overflow-wrap:anywhere] hover:underline"
                    >
                      {slug}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                      {owned.verifiedAt ? (
                        <Chip tone="ink">✓ Подтверждён {formatDate(owned.verifiedAt)}</Chip>
                      ) : (
                        <Chip tone="outline">Ждёт подтверждения</Chip>
                      )}
                      {latest && (
                        <Link href={`/a/${latest.id}`} className="underline-offset-4 hover:underline">
                          Последняя оценка: {STATUS_LABELS[latest.status] ?? latest.status}
                          {latest.status === 'done' && latest.score !== null && ` · ${latest.score}/100`}
                          {latest.finishedAt && ` · ${formatDate(latest.finishedAt)}`}
                        </Link>
                      )}
                    </div>
                  </div>
                  <form action={removeOwnedRepoAction}>
                    <input type="hidden" name="id" value={owned.id} />
                    <ConfirmSubmit
                      question={`Убрать ${slug} из своих? Ежедневный пересчёт остановится.`}
                    >
                      Убрать
                    </ConfirmSubmit>
                  </form>
                </div>

                {owned.verifiedAt ? (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium">Бейдж-карточка для README</h3>
                    <p className="text-xs text-[color:var(--muted)]">
                      Оценка, четыре категории, язык и дата пересчёта. Обновляется каждый день в 00:00.
                    </p>
                    <CardBadgeMarkdown org={repo.orgSlug} repo={repo.repoSlug} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-[color:var(--ink-2)]">
                      Положите этот ключ в репозиторий одним из способов:
                    </p>
                    <CopyField value={owned.verifyKey} label="Ключ подтверждения" />
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-[color:var(--ink-2)]">
                      <li>
                        добавьте ключ в <b>описание репозитория</b> в настройках SourceCraft;
                      </li>
                      <li>
                        или создайте в корне ветки по умолчанию <b>файл с именем ключа</b>, например{' '}
                        <code className="font-mono text-xs [overflow-wrap:anywhere]">{owned.verifyKey}.txt</code>{' '}
                        — содержимое не важно.
                      </li>
                    </ol>
                    <p className="text-xs text-[color:var(--muted)]">
                      После подтверждения ключ можно убрать.
                    </p>
                    {owned.lastCheckError && owned.lastCheckAt && (
                      <p className="text-xs text-[color:var(--muted)]">
                        Прошлая проверка {formatDateTime(owned.lastCheckAt)}: {owned.lastCheckError}
                      </p>
                    )}
                    <VerifyOwnedRepo id={owned.id} />
                  </div>
                )}
              </CardDiv>
            );
          })
        )}
      </section>
    </main>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: refreshTimeZone(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: refreshTimeZone(),
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
