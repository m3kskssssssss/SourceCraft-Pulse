// «Мои оценки» — вся история прогонов пользователя, независимо от публикации.
// Незавершённые и упавшие тоже здесь: иначе запущенный анализ негде найти.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserAnalyses, type HistoryItem } from '@/lib/history';
import { CategoryMini, Chip, EmptyState } from '@/app/components/ui';

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

          <ol className="mt-8 grid gap-3">
            {items.map((item, idx) => (
              <li
                key={item.id}
                className="rise"
                style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}
              >
                {/* Прогон — карточка: слева репозиторий и его состояние, справа
                    балл с разницей к прошлому разу. Раньше это была строка с
                    тремя фиксированными колонками, и три четверти её ширины
                    приходились на пустоту. */}
                <Link
                  href={`/a/${item.id}`}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-4 transition hover:border-[color:var(--line-2)] hover:shadow-[var(--shadow-1)] sm:p-5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium tracking-tight group-hover:underline">
                      <span className="text-[color:var(--muted)]">{item.org}/</span>
                      {item.repo}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--muted)]">
                      <Chip tone={item.status === 'done' ? 'default' : 'outline'}>
                        {STATUS_LABELS[item.status]}
                      </Chip>
                      {item.isPublic && <Chip tone="ink">В рейтинге</Chip>}
                      {item.kind === 'material' && <Chip tone="outline">Полезный материал</Chip>}
                      <span>{formatDateTime(item.finishedAt ?? item.createdAt)}</span>
                      {item.language && <span>· {item.language}</span>}
                    </div>
                    {item.status === 'done' && item.kind !== 'material' && (
                      <CategoryMini values={item.categories} className="mt-3" />
                    )}
                  </div>

                  <div className="text-right">
                    {item.kind === 'material' ? (
                      <div className="max-w-[5.5rem] text-[11px] font-semibold leading-tight text-[color:var(--ink-2)]">
                        Полезный материал
                      </div>
                    ) : (
                      <div className="text-2xl font-semibold tabular-nums leading-none">
                        {item.score ?? '—'}
                      </div>
                    )}
                    {item.delta !== null && item.delta !== 0 && (
                      <div
                        className="mt-1 text-xs tabular-nums"
                        style={{
                          color:
                            item.delta > 0 ? 'var(--accent-security)' : 'var(--accent-activity)',
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
