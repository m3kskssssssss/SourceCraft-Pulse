// Публичная карточка репозитория. Показывает последний опубликованный анализ.
// Если публичной записи нет — приглашение оценить.

import Link from 'next/link';
import { auth } from '@/auth';
import { getLatestPublicAnalysis } from '@/lib/ranking';
import { getChecksForAnalyses, getRepoHistory, type HistoryCheck } from '@/lib/history';
import { nextSlotStart } from '@/lib/commit-slots';
import { Bar, Chip, EmptyState, ScoreDial } from '@/app/components/ui';
import { CATEGORY_ACCENT_CLASS, CATEGORY_ORDER, CATEGORY_TITLES } from '@/lib/category-meta';
import { AnalysisHistory } from '@/app/components/AnalysisHistory';
import { BadgeMarkdown } from '@/app/components/BadgeMarkdown';
import { ReevaluateButton } from '@/app/components/ReevaluateButton';
import { ExportLinks } from '@/app/components/ExportLinks';
import { db } from '@/db/client';
import { findOwnedRepoId } from '@/lib/ownership';
import { APP_TIME_ZONE } from '@/lib/time';

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
  const checks = await getChecksForAnalyses(history.map((h) => h.id));
  // Последняя проверка коммитов по показанной оценке или по более свежей.
  const lastCheck = latest ? (checks.find((c) => c.analysisId === latest.id) ?? null) : null;

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
              <CheckLine check={lastCheck} />
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/a/${latest.id}`}
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-[color:var(--paper)] hover:bg-[color:var(--ink-2)]"
                >
                  Подробности анализа →
                </Link>
                <ReevaluateButton org={latest.org} repo={latest.repo} ownedId={ownedId} />
                <Link
                  href={`/compare?r=${encodeURIComponent(`${latest.org}/${latest.repo}`)}`}
                  className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] px-4 py-2 text-sm hover:bg-[color:var(--panel)]"
                >
                  Сравнить
                </Link>
              </div>
            </div>
          </div>

          {/* Баллы по категориям — только числа, без пояснений: они на
              странице анализа. Две колонки на телефоне, три на планшете,
              шесть в строку на широком экране. */}
          {latest.kind !== 'material' && (
            <div className="grid grid-cols-2 gap-px border-t border-[color:var(--line)] bg-[color:var(--line)] sm:grid-cols-3">
              {CATEGORY_ORDER.map((key, i) => {
                const value = latest.categories[key];
                return (
                  <div
                    key={key}
                    className={`${CATEGORY_ACCENT_CLASS[key]} rise bg-[color:var(--paper-2)] px-5 py-5 sm:px-8 sm:py-6`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center gap-2 text-sm text-[color:var(--ink-2)]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} aria-hidden />
                      <span className="truncate">{CATEGORY_TITLES[key]}</span>
                    </div>
                    <div
                      className={`mt-2 text-4xl font-semibold leading-none tabular-nums sm:text-5xl ${
                        value == null ? 'text-[color:var(--muted-2)]' : ''
                      }`}
                    >
                      {value ?? '—'}
                    </div>
                    <Bar value={value} height={5} accent className="mt-4" />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-[color:var(--line)] bg-[color:var(--paper-2)] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">Скачать</div>
            <ExportLinks analysisId={latest.id} />
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
      {history.length > 0 && (
        <section className="rise mt-10" style={{ animationDelay: '60ms' }}>
          <h2 className="text-2xl font-semibold tracking-tight">История оценок</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Дважды в сутки, в 00:00 и 12:00 по Москве, проверяем новые коммиты: нет — оценка
            остаётся той же, есть — репозиторий переоценивается.
          </p>
          <div className="mt-6">
            <AnalysisHistory items={history} checks={checks} />
          </div>
        </section>
      )}
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { timeZone: APP_TIME_ZONE, year: 'numeric', month: 'short', day: 'numeric' });
}

/** Итог последней проверки коммитов под оценкой на карточке. */
function CheckLine({ check }: { check: HistoryCheck | null }) {
  const next = formatDateTime(nextSlotStart().toISOString());
  let text: string;
  if (!check) text = `Новые коммиты проверим ${next} по Москве.`;
  else if (check.outcome === 'unchanged')
    text = `Проверено ${formatDateTime(check.checkedAt)}: новых коммитов нет, оценка актуальна. Следующая проверка — ${next}.`;
  else if (check.reanalysisStatus === 'queued' || check.reanalysisStatus === 'running')
    text = `${formatDateTime(check.checkedAt)} появились новые коммиты — репозиторий переоценивается.`;
  else text = `${formatDateTime(check.checkedAt)} появились новые коммиты, переоценка не удалась. Повторим ${next}.`;
  return (
    <p className="mt-4 flex items-start gap-2 text-xs text-[color:var(--muted)]">
      <span
        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: check?.outcome === 'changed' ? 'var(--accent-activity)' : 'var(--accent-security)' }}
        aria-hidden
      />
      <span>{text}</span>
    </p>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
