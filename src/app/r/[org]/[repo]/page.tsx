// Публичная карточка репозитория. Показывает последний опубликованный анализ.
// Если публичной записи нет — приглашение оценить.

import Link from 'next/link';
import { auth } from '@/auth';
import { getLatestPublicAnalysis } from '@/lib/ranking';
import { getRepoHistory } from '@/lib/history';
import { Chip, EmptyState, ScoreDial } from '@/app/components/ui';
import { AnalysisHistory } from '@/app/components/AnalysisHistory';
import { BadgeMarkdown } from '@/app/components/BadgeMarkdown';
import { ReevaluateButton } from '@/app/components/ReevaluateButton';
import { db } from '@/db/client';
import { findOwnedRepoId } from '@/lib/ownership';

type PageProps = { params: Promise<{ org: string; repo: string }> };

// Страница знает про сессию (в истории владелец видит и свои непубличные
// прогоны), поэтому кэшировать её нельзя.
export const dynamic = 'force-dynamic';

export default async function RepositoryPage({ params }: PageProps) {
  const { org, repo } = await params;

  const session = await auth();
  const viewerId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const [latest, history, ownedId] = await Promise.all([
    getLatestPublicAnalysis(org, repo),
    getRepoHistory({ org, repo, viewerId }),
    findOwnedRepoId(db, viewerId, { org, repo }),
  ]);
  const scUrl = `https://sourcecraft.dev/${org}/${repo}`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-14">
      <nav className="mb-6 text-sm text-[color:var(--muted)] [overflow-wrap:anywhere]">
        <Link href="/rating" className="hover:text-[color:var(--ink)]">
          Рейтинг
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[color:var(--ink-2)]">{org}/{repo}</span>
      </nav>

      <header>
        <div className="min-w-0">
          <Chip tone="outline">Карточка репозитория</Chip>
          {/* Имя репозитория — одно длинное «слово»: переносим по символам. */}
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
            {org}
            <span className="text-[color:var(--muted-2)]">/</span>
            {repo}
          </h1>
          <div className="mt-2 text-sm text-[color:var(--muted)]">
            <a
              href={scUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-[color:var(--ink)] hover:underline"
            >
              Открыть на SourceCraft ↗
            </a>
          </div>
        </div>
      </header>

      {latest ? (
        <section className="rise mt-6 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] sm:mt-10">
          {/* Та же раскладка, что у шапки анализа: на телефоне круг сверху,
              текст под ним на всю ширину. В одну строку с кругом колонке
              оставалось меньше сотни пикселей. */}
          <div className="flex flex-col items-start gap-6 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-10">
            {latest.kind !== 'material' && (
              <ScoreDial value={latest.score} size={168} stroke={14} label="pulse" />
            )}
            <div className="w-full min-w-0 sm:flex-1">
              <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                Последний публичный анализ
              </div>
              {latest.kind === 'material' ? (
                <div className="mt-1 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  Полезный материал
                </div>
              ) : (
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-5xl font-semibold tabular-nums leading-none">
                    {latest.score ?? '—'}
                  </span>
                  <span className="text-lg text-[color:var(--muted)]">/ 100</span>
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2 text-sm text-[color:var(--muted)]">
                {latest.kind === 'material' && <Chip tone="ink">Материал</Chip>}
                <Chip tone="default">{latest.language ?? 'Язык не определён'}</Chip>
                {latest.publishedAt && (
                  <Chip tone="default">Опубликовано {formatDate(latest.publishedAt)}</Chip>
                )}
                {latest.forks != null && (
                  <Chip tone="default">Форков: {latest.forks.toLocaleString('ru-RU')}</Chip>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/a/${latest.id}`}
                  className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-[color:var(--paper)] hover:bg-[color:var(--ink-2)]"
                >
                  Подробности анализа →
                </Link>
                <ReevaluateButton org={latest.org} repo={latest.repo} ownedId={ownedId} />
              </div>
            </div>
          </div>

          <div className="border-t border-[color:var(--line)] bg-[color:var(--paper)] p-5 sm:p-8">
            <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
              SVG-бейдж для README
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {/* SVG-бейдж — динамический эндпоинт, next/image здесь избыточен. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/badge/${org}/${repo}.svg`}
                alt={`Pulse ${latest.score}`}
                width={128}
                height={20}
                className="h-6"
              />
              <span className="text-xs text-[color:var(--muted)]">Обновляется автоматически.</span>
            </div>
            <div className="mt-4">
              <BadgeMarkdown org={org} repo={repo} />
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-6 sm:mt-10">
          <EmptyState
            title="Этот репозиторий ещё не оценивали"
            hint="Публичного анализа нет. Запустите оценку — опубликованный результат появится здесь."
            action={
              ownedId ? (
                <div className="mt-2">
                  <ReevaluateButton org={org} repo={repo} ownedId={ownedId} primary />
                </div>
              ) : (
                <Link
                  href={`/analyze?target=${encodeURIComponent(`${org}/${repo}`)}`}
                  className="mt-2 max-w-full rounded-full bg-[color:var(--ink)] px-4 py-2 text-center text-sm text-[color:var(--paper)] [overflow-wrap:anywhere]"
                >
                  Оценить {org}/{repo}
                </Link>
              )
            }
          />
        </div>
      )}
      {history.length > 1 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">История оценок</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Как менялась оценка от прогона к прогону.
          </p>
          <div className="mt-6">
            <AnalysisHistory items={history} />
          </div>
        </section>
      )}
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
}
