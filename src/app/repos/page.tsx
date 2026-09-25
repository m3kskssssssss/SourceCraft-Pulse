// «Мои репозитории»: карточки своих репозиториев с оценкой и бейджем,
// которые пересчитываются каждый день в 00:00.
//
// Подтверждение — личным токеном SourceCraft (lib/token-ownership.ts) или
// ключом в описании либо файлом в корне (lib/ownership.ts). Оба способа
// спрятаны под кнопку «Изменить настройки»; пока репозиториев нет, панель
// открыта сразу.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { analyses, ownedRepositories, repositories, sourcecraftTokens } from '@/db/schema';
import { removeOwnedRepoAction } from '@/app/actions/repos';
import {
  AddOwnedRepoForm,
  CardBadgeMarkdown,
  CopyField,
  EvaluateButton,
  RepoSettings,
  TokenSettings,
  type SavedTokenInfo,
  VerifyOwnedRepo,
} from '@/app/components/OwnedRepos';
import { ConfirmSubmit } from '@/app/components/ConfirmSubmit';
import { CardDiv, CategoryMini, Chip, EmptyState, ScoreDial } from '@/app/components/ui';
import { pickCategoryValues } from '@/lib/category-meta';
import { refreshTimeZone } from '@/lib/ownership';

export const dynamic = 'force-dynamic';

const PAT_DOCS = 'https://sourcecraft.dev/portal/docs/ru/sourcecraft/security/pat';

type Run = {
  id: string;
  repositoryId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  kind: string | null;
  score: number | null;
  categoryScores: unknown;
  finishedAt: Date | null;
};

type PageProps = { searchParams: Promise<{ error?: string }> };

export default async function MyRepositoriesPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/signin');
  // Ошибка кнопки «Оценить» (лимиты): действие уводит сюда с текстом в адресе.
  const { error: evaluateError } = await searchParams;

  const rows = await db
    .select({ owned: ownedRepositories, repo: repositories })
    .from(ownedRepositories)
    .innerJoin(repositories, eq(ownedRepositories.repositoryId, repositories.id))
    .where(and(eq(ownedRepositories.userId, userId), isNull(ownedRepositories.removedAt)))
    .orderBy(desc(ownedRepositories.verifiedAt), desc(ownedRepositories.createdAt));

  // По каждому репозиторию нужны два прогона: самый свежий (идёт ли что-то
  // сейчас) и последний посчитанный (балл на карточке). Список короткий —
  // до двадцати репозиториев, — поэтому берём прогоны пачкой и раскладываем.
  const repoIds = rows.map((r) => r.repo.id);
  const runs: Run[] = repoIds.length
    ? await db
        .select({
          id: analyses.id,
          repositoryId: analyses.repositoryId,
          status: analyses.status,
          kind: analyses.kind,
          score: analyses.score,
          categoryScores: analyses.categoryScores,
          finishedAt: analyses.finishedAt,
        })
        .from(analyses)
        .where(inArray(analyses.repositoryId, repoIds))
        .orderBy(desc(analyses.createdAt))
        .limit(repoIds.length * 10)
    : [];
  const latestRun = new Map<string, Run>();
  const latestDone = new Map<string, Run>();
  for (const run of runs) {
    if (!latestRun.has(run.repositoryId)) latestRun.set(run.repositoryId, run);
    if (run.status === 'done' && !latestDone.has(run.repositoryId)) latestDone.set(run.repositoryId, run);
  }

  const tokenRow = await db.query.sourcecraftTokens.findFirst({
    where: eq(sourcecraftTokens.userId, userId),
  });
  const savedToken: SavedTokenInfo | null = tokenRow
    ? {
        username: tokenRow.scUsername,
        displayName: tokenRow.scDisplayName,
        lastSyncLabel: tokenRow.lastSyncAt ? formatDateTime(tokenRow.lastSyncAt) : null,
        lastSyncError: tokenRow.lastSyncError,
        invalid: tokenRow.invalidAt !== null,
      }
    : null;

  const verified = rows.filter((r) => r.owned.verifiedAt);
  const pending = rows.filter((r) => !r.owned.verifiedAt);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
      <RepoSettings
        defaultOpen={rows.length === 0}
        header={
          <header className="rise">
            <Chip tone="outline">Свои репозитории</Chip>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Мои репозитории</h1>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
              Подтверждённые репозитории Pulse пересчитывает каждый день в 00:00 ({refreshTimeZone()}),
              и бейдж в README всегда показывает свежую оценку.
            </p>
          </header>
        }
      >
        <CardDiv tone="outline">
          <h2 className="text-base font-semibold">Личный токен SourceCraft</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            По токену найдём ваши репозитории — и публичные, и приватные — и подтвердим те, где у вас
            роль admin или maintainer. Приватные оцениваются только для вас и никуда не публикуются.
            Токен храним зашифрованным и каждые 5 минут подтягиваем новые репозитории. Отключить
            можно в любой момент — токен удалится.
          </p>
          {/* Инструкция нужна, пока токена нет или его пора менять. */}
          {(!savedToken || savedToken.invalid) && <PatGuide />}
          <div className="mt-5">
            <TokenSettings saved={savedToken} />
          </div>
        </CardDiv>

        <CardDiv tone="outline">
          <h2 className="text-base font-semibold">Добавить вручную и подтвердить ключом</h2>
          <p className="mb-4 mt-1 text-sm text-[color:var(--muted)]">
            Если репозиторий не нашёлся по токену — например, права выданы на уровне организации.
            Только публичные репозитории.
          </p>
          <AddOwnedRepoForm />
        </CardDiv>
      </RepoSettings>

      {evaluateError && (
        <p className="rise mt-6 rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          {evaluateError.slice(0, 200)}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Пока пусто"
          hint="Вставьте личный токен SourceCraft в настройках выше — ваши репозитории появятся здесь карточками."
        />
      ) : (
        <>
          {verified.length > 0 && (
            <section className="mt-10">
              <h2 className="text-sm font-medium text-[color:var(--muted)]">
                Подтверждённые · {verified.length}
              </h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {verified.map(({ owned, repo }) => (
                  <RepoCard
                    key={owned.id}
                    ownedId={owned.id}
                    org={repo.orgSlug}
                    repo={repo.repoSlug}
                    language={repo.language}
                    isPrivate={repo.isPrivate}
                    run={latestRun.get(repo.id) ?? null}
                    done={latestDone.get(repo.id) ?? null}
                  />
                ))}
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section className="mt-10">
              <h2 className="text-sm font-medium text-[color:var(--muted)]">
                Ждут подтверждения ключом · {pending.length}
              </h2>
              <div className="mt-3 flex flex-col gap-4">
                {pending.map(({ owned, repo }) => (
                  <PendingCard
                    key={owned.id}
                    ownedId={owned.id}
                    slug={`${repo.orgSlug}/${repo.repoSlug}`}
                    verifyKey={owned.verifyKey}
                    lastCheckAt={owned.lastCheckAt}
                    lastCheckError={owned.lastCheckError}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

/** Как получить личный токен — по документации SourceCraft. */
function PatGuide() {
  return (
    <details className="mt-4 rounded-2xl bg-[color:var(--panel)] px-4 py-3" open>
      <summary className="cursor-pointer text-sm font-medium">Как получить токен — 1 минута</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[color:var(--ink-2)]">
        <li>
          Откройте{' '}
          <a href="https://sourcecraft.dev" target="_blank" rel="noreferrer" className="underline underline-offset-4">
            sourcecraft.dev
          </a>{' '}
          и войдите в свой аккаунт.
        </li>
        <li>
          На панели слева нажмите <b>Домой</b>, затем <b>Доступ</b> → <b>Персональные токены доступа</b>.
        </li>
        <li>
          Нажмите <b>Сгенерировать новый токен</b> и задайте название, например <i>Pulse</i>. Срок
          действия выберите подлиннее: пока токен действует, новые репозитории подтягиваются сами.
          Когда он истечёт, мы попросим вставить новый.
        </li>
        <li>
          В доступе к репозиториям выберите <b>Все репозитории</b> — иначе мы увидим не все ваши
          проекты. Роль выберите <b>developer</b> или выше: с ней Pulse сможет предлагать вам
          pull request с улучшениями. Для одного подтверждения хватит и роли на чтение.
        </li>
        <li>
          Скопируйте токен сразу — SourceCraft показывает его только один раз. Он начинается с{' '}
          <code className="font-mono text-xs">pv1_</code>.
        </li>
        <li>
          Вставьте его в поле ниже и нажмите <b>Сохранить и синхронизировать</b>. Если удалите токен
          в SourceCraft, автосинхронизация остановится, а подтверждённые репозитории останутся.
        </li>
      </ol>
      <p className="mt-3 text-xs text-[color:var(--muted)]">
        Никому не пересылайте токен в чатах и письмах. Подробнее —{' '}
        <a href={PAT_DOCS} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          документация SourceCraft
        </a>
        .
      </p>
    </details>
  );
}

function RepoCard({
  ownedId,
  org,
  repo,
  language,
  isPrivate,
  run,
  done,
}: {
  ownedId: string;
  org: string;
  repo: string;
  language: string | null;
  isPrivate: boolean;
  run: Run | null;
  done: Run | null;
}) {
  const inProgress = run && (run.status === 'queued' || run.status === 'running') ? run : null;
  const isMaterial = done?.kind === 'material';

  return (
    <CardDiv tone="outline" className="rise flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-[color:var(--muted)] [overflow-wrap:anywhere]">{org}</div>
          <Link
            href={`/r/${org}/${repo}`}
            className="text-lg font-semibold leading-tight [overflow-wrap:anywhere] hover:underline"
          >
            {repo}
          </Link>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="ink">✓ Ваш</Chip>
            {isPrivate && <Chip tone="outline">🔒 Приватный · видно только вам</Chip>}
            {language && <Chip>{language}</Chip>}
            {inProgress && (
              <Chip tone="outline">{inProgress.status === 'running' ? 'Считается…' : 'В очереди'}</Chip>
            )}
          </div>
        </div>
        <ScoreDial value={isMaterial ? null : (done?.score ?? null)} size={72} stroke={6} animated={false} />
      </div>

      {done ? (
        isMaterial ? (
          <p className="text-sm text-[color:var(--muted)]">
            Полезный материал — такие репозитории баллом не меряем.
          </p>
        ) : (
          <div className="@container">
            <CategoryMini values={pickCategoryValues(done.categoryScores)} size="md" />
          </div>
        )
      ) : (
        <p className="text-sm text-[color:var(--muted)]">
          {inProgress
            ? 'Оценка уже считается — балл появится здесь.'
            : 'Ещё не оценивали. Нажмите «Оценить» — это займёт около минуты. После первой оценки репозиторий будет пересчитываться каждый день в 00:00.'}
        </p>
      )}

      {done?.finishedAt && (
        <div className="text-xs text-[color:var(--muted)]">
          Оценка от {formatDate(done.finishedAt)} · следующий пересчёт в 00:00
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {inProgress ? (
          <Link
            href={`/a/${inProgress.id}`}
            className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
          >
            Смотреть прогон →
          </Link>
        ) : done ? (
          <>
            <Link
              href={`/a/${done.id}`}
              className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
            >
              Открыть оценку →
            </Link>
            <EvaluateButton id={ownedId} again />
            <Link
              href={`/a/${done.id}#pr`}
              className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm transition hover:bg-[color:var(--panel)]"
            >
              Улучшить через PR
            </Link>
          </>
        ) : (
          <EvaluateButton id={ownedId} />
        )}
        <Link
          href={`/r/${org}/${repo}`}
          className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm transition hover:bg-[color:var(--panel)]"
        >
          История
        </Link>
        <form action={removeOwnedRepoAction} className="ml-auto">
          <input type="hidden" name="id" value={ownedId} />
          <ConfirmSubmit question={`Убрать ${org}/${repo} из своих? Ежедневный пересчёт остановится, и автосинхронизация его не вернёт.`}>
            Убрать
          </ConfirmSubmit>
        </form>
      </div>

      {/* У приватного репозитория бейджа нет: оценки не публикуются. */}
      {!isPrivate && (
      <details className="border-t border-[color:var(--line)] pt-4">
        <summary className="cursor-pointer text-sm font-medium">Бейдж для README</summary>
        <div className="mt-3">
          <CardBadgeMarkdown org={org} repo={repo} />
        </div>
      </details>
      )}
    </CardDiv>
  );
}

function PendingCard({
  ownedId,
  slug,
  verifyKey,
  lastCheckAt,
  lastCheckError,
}: {
  ownedId: string;
  slug: string;
  verifyKey: string;
  lastCheckAt: Date | null;
  lastCheckError: string | null;
}) {
  return (
    <CardDiv tone="outline" className="rise flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold [overflow-wrap:anywhere]">{slug}</div>
          <Chip tone="outline" className="mt-1">
            Ждёт подтверждения
          </Chip>
        </div>
        <form action={removeOwnedRepoAction}>
          <input type="hidden" name="id" value={ownedId} />
          <ConfirmSubmit question={`Убрать ${slug} из списка?`}>Убрать</ConfirmSubmit>
        </form>
      </div>
      <p className="text-sm text-[color:var(--ink-2)]">Положите этот ключ в репозиторий одним из способов:</p>
      <CopyField value={verifyKey} label="Ключ подтверждения" />
      <ol className="list-decimal space-y-1 pl-5 text-sm text-[color:var(--ink-2)]">
        <li>
          добавьте ключ в <b>описание репозитория</b> в настройках SourceCraft;
        </li>
        <li>
          или создайте в корне ветки по умолчанию <b>файл с именем ключа</b>, например{' '}
          <code className="font-mono text-xs [overflow-wrap:anywhere]">{verifyKey}.txt</code> — содержимое
          не важно.
        </li>
      </ol>
      {lastCheckError && lastCheckAt && (
        <p className="text-xs text-[color:var(--muted)]">
          Прошлая проверка {formatDateTime(lastCheckAt)}: {lastCheckError}
        </p>
      )}
      <VerifyOwnedRepo id={ownedId} />
    </CardDiv>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: refreshTimeZone(),
    day: 'numeric',
    month: 'long',
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
