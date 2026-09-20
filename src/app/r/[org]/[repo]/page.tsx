// Публичная карточка репозитория. Показывает последний опубликованный анализ.
// Если публичной записи нет — приглашение оценить.

import Link from 'next/link';
import { getLatestPublicAnalysis } from '@/lib/ranking';
import { Chip, EmptyState, ScoreDial } from '@/app/components/ui';
import { BadgeMarkdown } from '@/app/components/BadgeMarkdown';

type PageProps = { params: Promise<{ org: string; repo: string }> };

export const revalidate = 60;

export default async function RepositoryPage({ params }: PageProps) {
  const { org, repo } = await params;

  const latest = await getLatestPublicAnalysis(org, repo);
  const scUrl = `https://sourcecraft.tech/${org}/${repo}`;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-14">
      <nav className="mb-6 text-sm text-[color:var(--muted)]">
        <Link href="/" className="hover:text-[color:var(--ink)]">
          Рейтинг
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[color:var(--ink-2)]">{org}/{repo}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <Chip tone="outline">карточка репозитория</Chip>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
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
              открыть на SourceCraft ↗
            </a>
          </div>
        </div>
      </header>

      {latest ? (
        <section className="rise mt-10 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
          <div className="flex flex-wrap items-center gap-8 p-8 sm:p-10">
            <ScoreDial value={latest.score} size={144} stroke={12} label="pulse" />
            <div className="min-w-0 flex-1">
              <div className="text-sm uppercase tracking-widest text-[color:var(--muted)]">
                Последний публичный анализ
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {latest.score != null ? `${latest.score} из 100` : 'Нет данных'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-[color:var(--muted)]">
                <Chip tone="default">{latest.language ?? 'язык не определён'}</Chip>
                {latest.publishedAt && (
                  <Chip tone="default">опубликовано {formatDate(latest.publishedAt)}</Chip>
                )}
                {latest.forks != null && (
                  <Chip tone="default">форков: {latest.forks.toLocaleString('ru-RU')}</Chip>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/a/${latest.id}`}
                  className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-[color:var(--paper)] hover:bg-[color:var(--ink-2)]"
                >
                  Подробности анализа →
                </Link>
                <Link
                  href="/analyze"
                  className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--ink)] hover:bg-[color:var(--panel)]"
                >
                  Оценить заново
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-[color:var(--line)] bg-[color:var(--paper)] p-6 sm:p-8">
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
        <div className="mt-10">
          <EmptyState
            title="Этот репозиторий ещё не оценивали"
            hint="Публичного анализа пока нет. Запустите оценку — как только автор опубликует результат, он появится здесь."
            action={
              <Link
                href={`/analyze?target=${encodeURIComponent(`${org}/${repo}`)}`}
                className="mt-2 rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)]"
              >
                Оценить {org}/{repo}
              </Link>
            }
          />
        </div>
      )}
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
}
