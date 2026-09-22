// История прогонов одного репозитория: график и список с дельтами.
//
// Показывается и на карточке репозитория, и на странице анализа. На вход
// приходят прогоны от нового к старому (как их отдаёт lib/history).

import Link from 'next/link';
import type { HistoryItem } from '@/lib/history';

export function AnalysisHistory({
  items,
  currentId,
}: {
  items: HistoryItem[];
  /** Прогон, который открыт прямо сейчас, — подсвечиваем и не делаем ссылкой. */
  currentId?: string;
}) {
  if (items.length === 0) return null;

  // График рисуем в хронологическом порядке, список — от нового к старому.
  const chronological = [...items].reverse().filter((i) => i.score !== null);

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
      {chronological.length > 1 && (
        <div className="border-b border-[color:var(--line)] bg-[color:var(--paper-2)] px-5 py-4">
          <ScoreSparkline items={chronological} />
        </div>
      )}

      <ol className="divide-y divide-[color:var(--line)]">
        {items.map((item) => {
          const isCurrent = item.id === currentId;
          const row = (
            // Три колонки: дата с пометкой, балл, дельта. Дата сжимается —
            // на телефоне фиксированные колонки выдавливали строку за экран.
            <div className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-center gap-x-3 px-4 py-3 sm:px-5">
              <span className="min-w-0">
                <span className="block truncate text-xs text-[color:var(--muted)] sm:text-sm">
                  {formatDateTime(item.finishedAt ?? item.createdAt)}
                </span>
                <span className="mt-0.5 block text-[11px] text-[color:var(--muted-2)]">
                  {isCurrent ? 'Этот прогон' : item.isPublic ? 'В рейтинге' : 'Приватный'}
                </span>
              </span>
              <span className="text-right text-base font-semibold tabular-nums sm:text-lg">
                {item.score ?? '—'}
              </span>
              <span className="text-right text-sm tabular-nums">
                {item.delta === null || item.delta === 0 ? (
                  <span className="text-[color:var(--muted-2)]">—</span>
                ) : (
                  <span
                    style={{
                      color:
                        item.delta > 0 ? 'var(--accent-security)' : 'var(--accent-activity)',
                    }}
                  >
                    {item.delta > 0 ? '+' : ''}
                    {item.delta}
                  </span>
                )}
              </span>
            </div>
          );

          return (
            <li key={item.id} className={isCurrent ? 'bg-[color:var(--panel)]' : undefined}>
              {isCurrent ? (
                row
              ) : (
                <Link href={`/a/${item.id}`} className="block transition hover:bg-[color:var(--paper-2)]">
                  {row}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Линия оценок по времени. Без осей и подписей: это не график для чтения
 * значений, а форма изменения — сами числа есть в списке ниже.
 */
function ScoreSparkline({ items }: { items: HistoryItem[] }) {
  const width = 640;
  const height = 64;
  const padding = 6;

  const scores = items.map((i) => i.score ?? 0);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(1, max - min);

  const points = scores.map((score, idx) => {
    const x =
      items.length === 1
        ? width / 2
        : padding + (idx * (width - padding * 2)) / (items.length - 1);
    const y = height - padding - ((score - min) / span) * (height - padding * 2);
    return { x, y };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-16 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Оценки по времени: ${scores.join(', ')}`}
    >
      <path
        d={path}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="spark-draw"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((p, idx) => (
        <circle
          key={idx}
          cx={p.x}
          cy={p.y}
          r="3"
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
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
