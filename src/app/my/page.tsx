// «Мои оценки» — вся история прогонов пользователя, независимо от публикации.
// Незавершённые и упавшие тоже здесь: иначе запущенный анализ негде найти.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserAnalyses, type HistoryItem } from '@/lib/history';
import { Bar, Chip, EmptyState } from '@/app/components/ui';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<HistoryItem['status'], string> = {
  queued: 'В очереди',
  running: 'Считается',
  done: 'Готово',
  failed: 'Ошибка',
};

export default async function MyAnalysesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/signin?returnTo=%2Fmy');

  const items = await getUserAnalyses(userId);
  const done = items.filter((i) => i.status === 'done');
  const best = done.reduce<HistoryItem | null>(
    (acc, item) => (acc === null || (item.score ?? 0) > (acc.score ?? 0) ? item : acc),
    null,
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-14">
      <header className="rise">
        <h1 className="text-4xl font-semibold tracking-tight">Мои оценки</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Все запуски — и опубликованные, и приватные. Видны только вам.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Здесь пока ничего нет"
            hint="Оценённые репозитории появятся здесь вместе с историей прогонов."
            action={
              <Link
                href="/analyze"
                className="mt-2 rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
              >
                Оценить репозиторий
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="rise mt-8 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--line)] sm:grid-cols-3">
            <SummaryCell label="Всего запусков" value={String(items.length)} />
            <SummaryCell label="Посчитано" value={String(done.length)} />
            <SummaryCell
              label="Лучший результат"
              value={best?.score != null ? String(best.score) : '—'}
              hint={best ? `${best.org}/${best.repo}` : undefined}
            />
          </div>

          <ol className="mt-8 divide-y divide-[color:var(--line)]">
            {items.map((item, idx) => (
              <li
                key={item.id}
                className="rise"
                style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}
              >
                <Link
                  href={`/a/${item.id}`}
                  className="group flex flex-wrap items-center gap-4 py-4 transition hover:bg-[color:var(--paper-2)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-medium tracking-tight transition-transform duration-200 group-hover:translate-x-0.5 group-hover:underline">
                      {item.org}
                      <span className="text-[color:var(--muted-2)]">/</span>
                      {item.repo}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                      <Chip tone={item.status === 'done' ? 'default' : 'outline'}>
                        {STATUS_LABELS[item.status]}
                      </Chip>
                      {item.isPublic && <Chip tone="ink">В рейтинге</Chip>}
                      <span>{formatDateTime(item.finishedAt ?? item.createdAt)}</span>
                      {item.language && <span>· {item.language}</span>}
                    </div>
                  </div>

                  <div className="hidden w-32 sm:block">
                    <Bar value={item.score} />
                  </div>

                  <div className="w-24 text-right">
                    <div className="text-2xl font-semibold tabular-nums">{item.score ?? '—'}</div>
                    {item.delta !== null && item.delta !== 0 && (
                      <div
                        className="text-xs tabular-nums"
                        style={{
                          color: item.delta > 0 ? 'var(--accent-security)' : 'var(--accent-activity)',
                        }}
                      >
                        {item.delta > 0 ? '+' : ''}
                        {item.delta} к прошлому
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}

function SummaryCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-[color:var(--paper-2)] px-5 py-4">
      <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-[color:var(--muted)]">{hint}</div>}
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
