// История оценок одного репозитория: график и лента с дельтами.
//
// Показывается и на карточке репозитория, и на странице анализа. На вход
// приходят прогоны от нового к старому (как их отдаёт lib/history) и
// проверки новых коммитов: «коммитов не было» — это та же оценка, заново
// подтверждённая, поэтому в ленте она стоит отдельной строкой с тем же
// баллом и пометкой «без изменений», а на графике — точкой на том же уровне.

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { HistoryCheck, HistoryItem } from '@/lib/history';
import { APP_TIME_ZONE } from '@/lib/time';

type Entry =
  | { type: 'analysis'; at: string; item: HistoryItem; afterCommits: boolean }
  | { type: 'check'; at: string; check: HistoryCheck; score: number | null };

/** Сколько строк в ленте: проверки идут дважды в сутки и быстро копятся. */
const MAX_ROWS = 30;

export function AnalysisHistory({
  items,
  checks = [],
  currentId,
}: {
  items: HistoryItem[];
  checks?: HistoryCheck[];
  /** Прогон, который открыт прямо сейчас, — подсвечиваем и не делаем ссылкой. */
  currentId?: string;
}) {
  if (items.length === 0) return null;

  const scoreById = new Map(items.map((i) => [i.id, i.score]));
  // Прогоны, заведённые проверкой из-за новых коммитов, — подписываем.
  const fromCommits = new Set(
    checks.filter((c) => c.outcome === 'changed' && c.reanalysisId).map((c) => c.reanalysisId!),
  );

  const entries: Entry[] = [
    ...items.map(
      (item): Entry => ({
        type: 'analysis',
        at: item.finishedAt ?? item.createdAt,
        item,
        afterCommits: fromCommits.has(item.id),
      }),
    ),
    ...checks
      // Переоценка досчитана — её строка уже есть среди прогонов.
      .filter((c) => (c.outcome === 'unchanged' ? scoreById.has(c.analysisId) : c.reanalysisStatus !== 'done'))
      .map(
        (check): Entry => ({
          type: 'check',
          at: check.checkedAt,
          check,
          score: scoreById.get(check.analysisId) ?? null,
        }),
      ),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  // График в хронологическом порядке: прогоны и подтверждения «без изменений».
  const points = entries
    .filter((e) => (e.type === 'analysis' ? e.item.score !== null : e.check.outcome === 'unchanged' && e.score !== null))
    .map((e) => (e.type === 'analysis' ? e.item.score! : e.score!))
    .reverse();

  const visible = entries.slice(0, MAX_ROWS);

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
      {points.length > 1 && (
        <div className="border-b border-[color:var(--line)] bg-[color:var(--paper-2)] px-5 py-4">
          <ScoreSparkline scores={points} />
        </div>
      )}

      <ol className="divide-y divide-[color:var(--line)]">
        {visible.map((entry) =>
          entry.type === 'analysis' ? (
            <AnalysisRow
              key={entry.item.id}
              item={entry.item}
              isCurrent={entry.item.id === currentId}
              afterCommits={entry.afterCommits}
            />
          ) : (
            <CheckRow key={entry.check.id} check={entry.check} score={entry.score} currentId={currentId} />
          ),
        )}
      </ol>
      {entries.length > visible.length && (
        <div className="border-t border-[color:var(--line)] px-5 py-2.5 text-xs text-[color:var(--muted)]">
          Показаны последние {visible.length} записей из {entries.length}.
        </div>
      )}
    </div>
  );
}

/**
 * Три колонки: дата с пометкой, балл, дельта. Дата сжимается — на телефоне
 * фиксированные колонки выдавливали строку за экран.
 */
function RowGrid({
  at,
  note,
  score,
  delta,
}: {
  at: string;
  note: string;
  score: ReactNode;
  delta: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-center gap-x-3 px-4 py-3 sm:px-5">
      <span className="min-w-0">
        <span className="block truncate text-xs text-[color:var(--muted)] sm:text-sm">{formatDateTime(at)}</span>
        <span className="mt-0.5 block text-[11px] text-[color:var(--muted-2)]">{note}</span>
      </span>
      <span className="text-right text-base font-semibold tabular-nums sm:text-lg">{score}</span>
      <span className="text-right text-sm tabular-nums">{delta}</span>
    </div>
  );
}

function RowLink({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <li className={current ? 'bg-[color:var(--panel)]' : undefined}>
      {current ? (
        children
      ) : (
        <Link href={href} className="block transition hover:bg-[color:var(--paper-2)]">
          {children}
        </Link>
      )}
    </li>
  );
}

function AnalysisRow({
  item,
  isCurrent,
  afterCommits,
}: {
  item: HistoryItem;
  isCurrent: boolean;
  afterCommits: boolean;
}) {
  const where = isCurrent ? 'Этот прогон' : item.isPublic ? 'В рейтинге' : 'Приватный';
  return (
    <RowLink href={`/a/${item.id}`} current={isCurrent}>
      <RowGrid
        at={item.finishedAt ?? item.createdAt}
        note={afterCommits ? `${where} · переоценка после новых коммитов` : where}
        score={item.score ?? '—'}
        delta={
          item.delta === null || item.delta === 0 ? (
            <span className="text-[color:var(--muted-2)]">—</span>
          ) : (
            <span style={{ color: item.delta > 0 ? 'var(--accent-security)' : 'var(--accent-activity)' }}>
              {item.delta > 0 ? '+' : ''}
              {item.delta}
            </span>
          )
        }
      />
    </RowLink>
  );
}

function CheckRow({
  check,
  score,
  currentId,
}: {
  check: HistoryCheck;
  score: number | null;
  currentId?: string;
}) {
  if (check.outcome === 'unchanged') {
    return (
      <RowLink href={`/a/${check.analysisId}`} current={check.analysisId === currentId}>
        <RowGrid
          at={check.checkedAt}
          note="Новых коммитов нет — оценка та же"
          score={<span className="text-[color:var(--ink-2)]">{score ?? '—'}</span>}
          delta={
            <span className="text-[11px] text-[color:var(--muted-2)]" title="Оценка не изменилась">
              без изм.
            </span>
          }
        />
      </RowLink>
    );
  }
  const failed = check.reanalysisStatus === 'failed' || check.reanalysisStatus === null;
  return (
    <RowLink href={check.reanalysisId ? `/a/${check.reanalysisId}` : `/a/${check.analysisId}`} current={false}>
      <RowGrid
        at={check.checkedAt}
        note={failed ? 'Новые коммиты — переоценка не удалась' : 'Новые коммиты — переоценивается'}
        score={<span className="text-[color:var(--muted-2)]">{failed ? '—' : '…'}</span>}
        delta={<span className="text-[color:var(--muted-2)]">—</span>}
      />
    </RowLink>
  );
}

/**
 * Линия оценок по времени. Без осей и подписей: это не график для чтения
 * значений, а форма изменения — сами числа есть в списке ниже.
 */
function ScoreSparkline({ scores }: { scores: number[] }) {
  const width = 640;
  const height = 64;
  const padding = 6;

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(1, max - min);

  const points = scores.map((score, idx) => {
    const x =
      scores.length === 1
        ? width / 2
        : padding + (idx * (width - padding * 2)) / (scores.length - 1);
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
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
