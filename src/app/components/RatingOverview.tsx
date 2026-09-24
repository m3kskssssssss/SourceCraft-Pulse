// Сводка над рейтингом: четыре числа, распределение баллов и средние по
// категориям. Одна серия в гистограмме — без легенды, подпись её называет.

import Link from 'next/link';
import { SCORE_BUCKETS, type LeaderboardOverview } from '@/lib/ranking';
import { CATEGORY_ACCENT_CLASS, CATEGORY_ORDER, CATEGORY_TITLES } from '@/lib/category-meta';
import { Bar } from './ui';

export function RatingOverview({
  overview,
  facets,
}: {
  overview: LeaderboardOverview;
  facets: Array<{ name: string; count: number }>;
}) {
  const maxBucket = Math.max(1, ...overview.buckets);
  const tiles = [
    { label: 'Репозиториев в рейтинге', value: overview.total, note: overview.materials > 0 ? `из них ${overview.materials} — материалы` : null },
    { label: 'Средний балл', value: overview.averageScore ?? '—', note: overview.medianScore != null ? `медиана ${overview.medianScore}` : null },
    { label: 'Оценок от людей', value: overview.ratings, note: null },
    { label: 'Комментариев', value: overview.comments, note: null },
  ];

  return (
    <section className="rise" style={{ animationDelay: '120ms' }}>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--line)] lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-0 bg-[color:var(--paper-2)] px-4 py-4 sm:px-6 sm:py-5">
            <div className="text-xs leading-snug text-[color:var(--muted)] sm:text-sm">{t.label}</div>
            <div className="mt-2 text-3xl font-semibold leading-none tabular-nums sm:text-4xl">{t.value}</div>
            {t.note && <div className="mt-1.5 text-xs text-[color:var(--muted-2)]">{t.note}</div>}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Распределение баллов: одна серия, поэтому без легенды — подпись над
            графиком её называет. Число над столбцом, подсказка при наведении. */}
        <div className="rounded-3xl border border-[color:var(--line)] p-5 sm:p-6">
          <div className="text-sm font-medium">Как распределились баллы</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            Проектов в каждом диапазоне; материалы без оценки сюда не входят.
          </div>
          <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3">
            {SCORE_BUCKETS.map((b, i) => {
              const count = overview.buckets[i] ?? 0;
              const height = count === 0 ? 0 : Math.max(6, (count / maxBucket) * 100);
              return (
                <div
                  key={b.label}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  title={`${b.label}: ${count} ${plural(count, 'проект', 'проекта', 'проектов')}`}
                >
                  <span className="mb-1 text-xs tabular-nums text-[color:var(--ink-2)]">{count}</span>
                  <div
                    className="w-full rounded-t-[4px] bg-[color:var(--ink)] transition group-hover:opacity-80"
                    style={{ height: `${height}%`, opacity: 0.35 + 0.65 * ((i + 1) / SCORE_BUCKETS.length) }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2 border-t border-[color:var(--line)] pt-2 sm:gap-3">
            {SCORE_BUCKETS.map((b) => (
              <span key={b.label} className="min-w-0 flex-1 text-center text-[11px] tabular-nums text-[color:var(--muted)]">
                {b.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--line)] p-5 sm:p-6">
          <div className="text-sm font-medium">Средний балл по категориям</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">Где у опубликованных проектов больше всего пробелов.</div>
          <ul className="mt-5 grid gap-4">
            {CATEGORY_ORDER.map((key) => {
              const value = overview.categoryAverages[key];
              return (
                <li key={key} className={`${CATEGORY_ACCENT_CLASS[key] ?? ''} grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-center gap-3`}>
                  <span className="truncate text-sm text-[color:var(--ink-2)]">{CATEGORY_TITLES[key]}</span>
                  <Bar value={value} height={6} accent />
                  <span className="text-right text-sm font-semibold tabular-nums">{value ?? '—'}</span>
                </li>
              );
            })}
          </ul>

          {facets.length > 0 && (
            <div className="mt-6 border-t border-[color:var(--line)] pt-4">
              <div className="text-xs text-[color:var(--muted)]">Языки</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {facets.map((f) => (
                  <Link
                    key={f.name}
                    href={`/rating?lang=${encodeURIComponent(f.name)}`}
                    className="rounded-full bg-[color:var(--panel)] px-2.5 py-1 text-xs text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel-2)]"
                  >
                    {f.name} <span className="tabular-nums text-[color:var(--muted-2)]">{f.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = count % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
