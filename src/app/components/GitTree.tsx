'use client';

// Путь создания репозитория: коммиты, ветвления и слияния.
//
// Слева рисуется сам граф (SVG), справа — строки коммитов. Высота строки
// одинаковая для обеих половин, поэтому узел всегда напротив своей подписи.
//
// Середина длинной истории в фактах выброшена (см. git/graph.ts), поэтому
// разрыв показываем явной отбивкой, а не склеиваем концы молча.

import { useMemo, useState, useSyncExternalStore } from 'react';
import type { GitGraph, GraphCommit } from '@/lib/git/graph';

const ROW = 38;
const LANE = 18;
const PAD_X = 16;
/**
 * Сколько коммитов с каждого конца видно до «показать весь путь»: начало и
 * последние изменения, середина — в разрыве. На телефоне по два.
 */
const COLLAPSED_ENDS = 3;
const COLLAPSED_ENDS_PHONE = 2;
/**
 * Предельная ширина графа. Широкое дерево не раздвигает строки, а сжимает
 * расстояние между дорожками: на телефоне под граф отдаём меньше.
 */
const MAX_GRAPH_WIDTH = 220;
const MAX_GRAPH_WIDTH_PHONE = 88;
const MIN_LANE = 5;

const PHONE_QUERY = '(max-width: 639px)';

/** Узкий ли экран. На сервере считаем, что нет, — после гидрации уточнится. */
function usePhone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(PHONE_QUERY);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

type Geometry = { lane: number; pad: number };

/** Цвет дорожки. Основная линия — чернила, ветки разбираются по акцентам. */
const LANE_COLORS = [
  'var(--ink)',
  'var(--accent-code)',
  'var(--accent-security)',
  'var(--accent-docs)',
  'var(--accent-activity)',
];

type Row =
  | { kind: 'commit'; commit: GraphCommit }
  | { kind: 'gap'; count: number };

export function GitTree({ graph, webUrl }: { graph: GitGraph; webUrl?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const phone = usePhone();
  const ends = phone ? COLLAPSED_ENDS_PHONE : COLLAPSED_ENDS;

  const rows = useMemo(() => buildRows(graph, expanded, ends), [graph, expanded, ends]);
  const commitRows = rows.filter((r): r is Extract<Row, { kind: 'commit' }> => r.kind === 'commit');

  // Номер строки по коммиту — нужен, чтобы дотянуть ребро до родителя.
  const rowByOid = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, index) => {
      if (row.kind === 'commit') map.set(row.commit.oid, index);
    });
    return map;
  }, [rows]);

  // Ширину считаем по дорожкам, которые реально видны: в свёрнутом виде
  // дерево на десяток веток часто занимает одну-две.
  const maxLane = commitRows.reduce((m, row) => Math.max(m, row.commit.lane), 0);
  const pad = phone ? 10 : PAD_X;
  const maxWidth = phone ? MAX_GRAPH_WIDTH_PHONE : MAX_GRAPH_WIDTH;
  const geo: Geometry = {
    pad,
    lane: maxLane === 0 ? LANE : Math.max(MIN_LANE, Math.min(LANE, (maxWidth - pad * 2) / maxLane)),
  };
  const width = Math.ceil(geo.pad * 2 + maxLane * geo.lane);
  const height = rows.length * ROW;
  const merges = graph.commits.filter((c) => c.parents.length > 1).length;
  const hidden = graph.commits.length - commitRows.length;
  const selectedCommit = graph.commits.find((c) => c.oid === selected) ?? null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[color:var(--line)] bg-[color:var(--paper-2)] px-4 py-3 text-sm sm:gap-x-6 sm:px-5 sm:py-4">
        <span>
          <strong className="tabular-nums">{graph.totalRead}</strong>{' '}
          {plural(graph.totalRead, 'коммит', 'коммита', 'коммитов')} в пути
        </span>
        <span className="text-[color:var(--muted)]">
          {merges > 0
            ? `${merges} ${plural(merges, 'слияние', 'слияния', 'слияний')}`
            : 'без слияний'}
        </span>
        {graph.firstCommitDate && (
          <span className="text-[color:var(--muted)]">
            {graph.truncated ? 'самый ранний в клоне' : 'начало'}{' '}
            {formatDate(graph.firstCommitDate)}
          </span>
        )}
      </div>

      <div className="relative overflow-x-auto">
        <div className="relative" style={{ minHeight: height }}>
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={width}
            height={height}
            aria-hidden="true"
          >
            {/* Рёбра рисуем первыми, чтобы узлы легли поверх линий. */}
            {commitRows.map((row) => {
              const from = rowByOid.get(row.commit.oid);
              if (from === undefined) return null;
              return row.commit.parents.map((parent, parentIndex) => {
                const to = rowByOid.get(parent);
                const lane = parentLane(graph, parent, row.commit.lane);
                return (
                  <path
                    key={`${row.commit.oid}-${parent}-${parentIndex}`}
                    d={
                      to === undefined
                        ? stubPath(geo, row.commit.lane, from)
                        : edgePath(geo, row.commit.lane, from, lane, to)
                    }
                    fill="none"
                    stroke={laneColor(lane)}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    opacity={to === undefined ? 0.35 : 0.7}
                    pathLength={1}
                    className="tree-edge"
                    style={{ animationDelay: `${Math.min(from, 30) * 18}ms` }}
                  />
                );
              });
            })}

            {commitRows.map((row) => {
              const index = rowByOid.get(row.commit.oid) ?? 0;
              const isMerge = row.commit.parents.length > 1;
              const isSelected = row.commit.oid === selected;
              return (
                <circle
                  key={row.commit.oid}
                  cx={laneX(geo, row.commit.lane)}
                  cy={index * ROW + ROW / 2}
                  r={isSelected ? 6 : isMerge ? 5 : 4}
                  fill={isMerge ? 'var(--paper)' : laneColor(row.commit.lane)}
                  stroke={laneColor(row.commit.lane)}
                  strokeWidth={isMerge ? 2 : isSelected ? 3 : 0}
                  className="tree-node"
                  style={{ animationDelay: `${Math.min(index, 30) * 18}ms` }}
                />
              );
            })}
          </svg>

          <ol style={{ paddingLeft: width }}>
            {rows.map((row, index) =>
              row.kind === 'gap' ? (
                <li
                  key={`gap-${index}`}
                  className="flex items-center gap-2 px-2 text-xs text-[color:var(--muted-2)] sm:gap-3 sm:px-4"
                  style={{ height: ROW }}
                >
                  <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,var(--line)_0_6px,transparent_6px_12px)]" />
                  <span className="shrink-0">
                    пропущено {row.count}{' '}
                    {plural(row.count, 'коммит', 'коммита', 'коммитов')}
                  </span>
                  <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,var(--line)_0_6px,transparent_6px_12px)]" />
                </li>
              ) : (
                <li key={row.commit.oid} style={{ height: ROW }}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected((current) =>
                        current === row.commit.oid ? null : row.commit.oid,
                      )
                    }
                    aria-pressed={row.commit.oid === selected}
                    className={`flex h-full w-full items-center gap-2 px-2 text-left transition hover:bg-[color:var(--panel)] sm:gap-3 sm:px-4 ${
                      row.commit.oid === selected ? 'bg-[color:var(--panel)]' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {row.commit.subject || '(без описания)'}
                    </span>
                    {row.commit.refs.map((ref) => (
                      <span
                        key={ref}
                        className="hidden shrink-0 rounded-full border border-[color:var(--line)] px-2 py-0.5 text-[11px] text-[color:var(--ink-2)] sm:inline"
                      >
                        {ref}
                      </span>
                    ))}
                    <span className="hidden w-32 shrink-0 truncate text-xs text-[color:var(--muted)] md:inline">
                      {row.commit.author}
                    </span>
                    <span className="shrink-0 text-right text-[11px] tabular-nums text-[color:var(--muted-2)] sm:w-20 sm:text-xs">
                      {formatDate(row.commit.date)}
                    </span>
                  </button>
                </li>
              ),
            )}
          </ol>
        </div>
      </div>

      {selectedCommit && (
        <div className="border-t border-[color:var(--line)] bg-[color:var(--paper-2)] px-4 py-3 sm:px-5 sm:py-4">
          <div className="text-sm leading-relaxed [overflow-wrap:anywhere]">{selectedCommit.subject}</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--muted)]">
            <span className="break-all font-mono">{selectedCommit.oid}</span>
            <span>{selectedCommit.author}</span>
            <span>{formatDateTime(selectedCommit.date)}</span>
            {selectedCommit.parents.length > 1 && <span>слияние</span>}
            {webUrl && (
              <a
                className="underline underline-offset-4 hover:text-[color:var(--ink)]"
                href={`${webUrl.replace(/\/$/, '')}/commit/${selectedCommit.oid}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                Открыть на SourceCraft
              </a>
            )}
          </div>
        </div>
      )}

      {hidden > 0 && (
        <div className="border-t border-[color:var(--line)] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-sm text-[color:var(--ink-2)] underline underline-offset-4 hover:text-[color:var(--ink)]"
          >
            {expanded
              ? 'Свернуть путь'
              : `Показать весь путь — ещё ${hidden} ${plural(hidden, 'коммит', 'коммита', 'коммитов')}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- раскладка ----------

/** Строки к показу: свежая часть, разрыв, начало пути. */
function buildRows(graph: GitGraph, expanded: boolean, ends: number): Row[] {
  const rows: Row[] = [];
  const pushCommits = (list: GraphCommit[]) => {
    for (const commit of list) rows.push({ kind: 'commit', commit });
  };

  const { commits, gapAfterIndex, skipped } = graph;

  if (expanded) {
    if (gapAfterIndex === null) {
      pushCommits(commits);
      return rows;
    }
    pushCommits(commits.slice(0, gapAfterIndex + 1));
    rows.push({ kind: 'gap', count: skipped });
    pushCommits(commits.slice(gapAfterIndex + 1));
    return rows;
  }

  // Свёрнутый вид: оба конца пути видно сразу, середина — в разрыве.
  if (commits.length <= ends * 2 && gapAfterIndex === null) {
    pushCommits(commits);
    return rows;
  }

  const recent = commits.slice(0, ends);
  const root = commits.slice(Math.max(ends, commits.length - ends));
  pushCommits(recent);
  rows.push({
    kind: 'gap',
    count: commits.length - recent.length - root.length + skipped,
  });
  pushCommits(root);
  return rows;
}

function laneX(geo: Geometry, lane: number): number {
  return geo.pad + lane * geo.lane;
}

function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length] ?? 'var(--ink)';
}

/** Дорожка родителя: если его в выборке нет, ведём линию по дорожке потомка. */
function parentLane(graph: GitGraph, parentOid: string, fallback: number): number {
  return graph.commits.find((c) => c.oid === parentOid)?.lane ?? fallback;
}

function edgePath(geo: Geometry, fromLane: number, fromRow: number, toLane: number, toRow: number): string {
  const x1 = laneX(geo, fromLane);
  const y1 = fromRow * ROW + ROW / 2;
  const x2 = laneX(geo, toLane);
  const y2 = toRow * ROW + ROW / 2;
  if (x1 === x2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const bend = Math.min((y2 - y1) / 2, ROW);
  return `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`;
}

/** Родителя в выборке нет: обрываем линию вниз — путь продолжается за кадром. */
function stubPath(geo: Geometry, lane: number, fromRow: number): string {
  const x = laneX(geo, lane);
  const y = fromRow * ROW + ROW / 2;
  return `M ${x} ${y} L ${x} ${y + ROW * 0.55}`;
}

// ---------- форматирование ----------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Русское склонение по числу: 1 коммит, 2 коммита, 5 коммитов. */
function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = count % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
