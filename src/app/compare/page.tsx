// Сравнение репозиториев: до четырёх опубликованных оценок в одной таблице.
//
// Всё берётся из сохранённых анализов — ничего не пересчитывается и не
// запрашивается у SourceCraft, поэтому страница работает и для оценок,
// посчитанных давно. Состав сравнения живёт в адресе: /compare?r=org/repo&r=…

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Chip, EmptyState } from '@/app/components/ui';
import { CATEGORY_ACCENT_CLASS, CATEGORY_ORDER, CATEGORY_TITLES } from '@/lib/category-meta';
import { readExtraAnalytics, type ExtraAnalytics } from '@/lib/extra-analytics';
import { metricLabel } from '@/lib/metric-labels';
import { findLatestPublicAnalysis } from '@/lib/public-report';
import { getLatestPublicAnalysis, type LeaderboardItem } from '@/lib/ranking';
import { computeCoverage } from '@/lib/scoring/coverage';
import type { CategoryScore } from '@/lib/scoring/types';
import { parseSlug } from '@/lib/slug';
import { APP_TIME_ZONE } from '@/lib/time';

export const dynamic = 'force-dynamic';

const MAX_REPOS = 4;

/** Метрики, по которым проекты чаще всего расходятся. */
const KEY_METRICS = [
  'code.tests',
  'code.has_linter',
  'activity.commits_90d',
  'activity.freshness',
  'activity.bus_factor',
  'docs.readme',
  'ci.config',
  'ci.runs_tests',
  'issues.closed_share',
  'issues.reaction_time',
];

type Column =
  | { slug: string; found: false }
  | {
      slug: string;
      found: true;
      item: LeaderboardItem;
      coverage: number | null;
      metrics: Map<string, { value: number | null; hint: string | null }>;
      extras: ExtraAnalytics;
      finishedAt: string | null;
    };

type PageProps = { searchParams: Promise<{ r?: string | string[] }> };

export default async function ComparePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = (Array.isArray(sp.r) ? sp.r : sp.r ? [sp.r] : [])
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter(Boolean);
  const slugs = [...new Set(raw)].slice(0, MAX_REPOS);
  const columns = await Promise.all(slugs.map(loadColumn));
  const found = columns.filter((c): c is Extract<Column, { found: true }> => c.found);

  const best = (pick: (c: Extract<Column, { found: true }>) => number | null): number | null => {
    const values = found.map(pick).filter((v): v is number => v !== null).map(Math.round);
    // Выделять нечего, если сравнивать не с чем или все значения равны.
    if (values.length < 2 || values.every((v) => v === values[0])) return null;
    return Math.max(...values);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      <Chip tone="outline">Рейтинг</Chip>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Сравнение репозиториев</h1>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
        До {MAX_REPOS} репозиториев с опубликованной оценкой. Лучшее значение в строке выделено.
        «Нет данных» не считается худшим результатом.
      </p>

      <form action="/compare" className="mt-6 flex max-w-xl flex-wrap gap-2">
        {slugs.map((s) => (
          <input key={s} type="hidden" name="r" value={s} />
        ))}
        <input
          name="r"
          placeholder="org/repo"
          aria-label="Репозиторий для сравнения"
          disabled={slugs.length >= MAX_REPOS}
          className="min-w-0 flex-1 rounded-full border border-[color:var(--line)] bg-[color:var(--paper)] px-4 py-2 text-sm outline-none focus:border-[color:var(--ink)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={slugs.length >= MAX_REPOS}
          className="rounded-full bg-[color:var(--ink)] px-5 py-2 text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)] disabled:opacity-40"
        >
          Добавить
        </button>
      </form>

      {columns.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Добавьте репозитории"
          hint="Введите org/repo или откройте сравнение с карточки репозитория."
        />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-3xl border border-[color:var(--line)]">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-[color:var(--paper-2)]">
                <th className="w-56 px-4 py-3 text-left text-xs font-normal uppercase tracking-widest text-[color:var(--muted)]">
                  Показатель
                </th>
                {columns.map((c) => (
                  <th key={c.slug} className="px-4 py-3 text-left align-top font-medium">
                    {c.found ? (
                      <Link href={`/r/${c.item.org}/${c.item.repo}`} className="[overflow-wrap:anywhere] hover:underline">
                        {c.item.org}/{c.item.repo}
                      </Link>
                    ) : (
                      <span className="[overflow-wrap:anywhere]">{c.slug}</span>
                    )}
                    <div className="mt-1">
                      <Link
                        href={compareHref(slugs.filter((s) => s !== c.slug))}
                        className="text-xs font-normal text-[color:var(--muted)] hover:text-[color:var(--ink)]"
                      >
                        убрать
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              <Row
                label="Repo Health Score"
                strong
                columns={columns}
                best={best((c) => (c.item.kind === 'material' ? null : c.item.score))}
                value={(c) => (c.item.kind === 'material' ? null : c.item.score)}
                render={(c) => (c.item.kind === 'material' ? 'Полезный материал' : (c.item.score ?? '—'))}
              />
              <Row
                label="Покрытие данных"
                columns={columns}
                best={null}
                value={(c) => c.coverage}
                render={(c) => (c.coverage === null ? '—' : `${Math.round(c.coverage * 100)}%`)}
              />
              <GroupRow label="Категории" span={columns.length} />
              {CATEGORY_ORDER.map((key) => (
                <Row
                  key={key}
                  label={
                    <span className={`${CATEGORY_ACCENT_CLASS[key]} inline-flex items-center gap-2`}>
                      <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} aria-hidden />
                      {CATEGORY_TITLES[key]}
                    </span>
                  }
                  columns={columns}
                  best={best((c) => c.item.categories[key])}
                  value={(c) => c.item.categories[key]}
                  render={(c) => c.item.categories[key] ?? 'нет данных'}
                />
              ))}
              <GroupRow label="Ключевые метрики" span={columns.length} />
              {KEY_METRICS.map((key) => (
                <Row
                  key={key}
                  label={metricLabel(key)}
                  columns={columns}
                  best={best((c) => c.metrics.get(key)?.value ?? null)}
                  value={(c) => c.metrics.get(key)?.value ?? null}
                  render={(c) => {
                    const m = c.metrics.get(key);
                    if (!m || m.value === null) return 'нет данных';
                    return (
                      <>
                        <span className="tabular-nums">{Math.round(m.value)}</span>
                        {m.hint && <span className="mt-0.5 block text-xs text-[color:var(--muted)]">{m.hint}</span>}
                      </>
                    );
                  }}
                />
              ))}
              <GroupRow label="Дополнительная аналитика (вне балла)" span={columns.length} />
              <Row
                label="CODEOWNERS"
                columns={columns}
                best={null}
                value={() => null}
                render={(c) =>
                  c.extras.codeowners.status === 'present' ? 'есть' : c.extras.codeowners.status === 'absent' ? 'нет' : 'нет данных'
                }
              />
              <Row
                label="Пустые коммиты за 90 дней"
                columns={columns}
                best={null}
                value={() => null}
                render={(c) =>
                  c.extras.emptyCommits.status === 'known'
                    ? `${c.extras.emptyCommits.empty} из ${c.extras.emptyCommits.total}`
                    : 'нет данных'
                }
              />
              <Row
                label="PR с ревью"
                columns={columns}
                best={best((c) => reviewShare(c.extras))}
                value={(c) => reviewShare(c.extras)}
                render={(c) => {
                  const r = c.extras.reviews;
                  if (!r?.available) return 'нет данных';
                  if (r.sampledPrs === 0) return 'PR нет';
                  return `${r.reviewedPrs} из ${r.sampledPrs}`;
                }}
              />
              <GroupRow label="Сведения" span={columns.length} />
              <Row label="Язык" columns={columns} best={null} value={() => null} render={(c) => c.item.language ?? '—'} />
              <Row
                label="Лайки SourceCraft"
                columns={columns}
                best={null}
                value={() => null}
                render={(c) => (c.item.likes === null ? '—' : c.item.likes.toLocaleString('ru-RU'))}
              />
              <Row
                label="Последняя активность"
                columns={columns}
                best={null}
                value={() => null}
                render={(c) => formatDate(c.item.lastActivityAt)}
              />
              <Row label="Дата анализа" columns={columns} best={null} value={() => null} render={(c) => formatDate(c.finishedAt)} />
              <Row
                label="Отчёт"
                columns={columns}
                best={null}
                value={() => null}
                render={(c) => (
                  <Link href={`/a/${c.item.id}`} className="underline underline-offset-4 hover:no-underline">
                    Подробности анализа
                  </Link>
                )}
              />
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

async function loadColumn(slug: string): Promise<Column> {
  let org: string;
  let repo: string;
  try {
    ({ org, repo } = parseSlug(slug));
  } catch {
    return { slug, found: false };
  }
  const [item, full] = await Promise.all([getLatestPublicAnalysis(org, repo), findLatestPublicAnalysis(org, repo)]);
  if (!item || !full) return { slug, found: false };

  const metrics = new Map<string, { value: number | null; hint: string | null }>();
  for (const c of (full.analysis.categoryScores ?? []) as CategoryScore[]) {
    for (const m of Array.isArray(c.metrics) ? c.metrics : []) {
      metrics.set(m.key, { value: m.unknown ? null : m.value, hint: m.hint ?? null });
    }
  }
  return {
    slug,
    found: true,
    item,
    coverage: computeCoverage(full.analysis.categoryScores),
    metrics,
    extras: readExtraAnalytics(full.analysis.metrics),
    finishedAt: full.analysis.finishedAt ? full.analysis.finishedAt.toISOString() : null,
  };
}

function Row({
  label,
  columns,
  render,
  value,
  best,
  strong = false,
}: {
  label: ReactNode;
  columns: Column[];
  render: (c: Extract<Column, { found: true }>) => ReactNode;
  value: (c: Extract<Column, { found: true }>) => number | null;
  best: number | null;
  strong?: boolean;
}) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 text-left align-top font-normal text-[color:var(--ink-2)]">
        {label}
      </th>
      {columns.map((c) => {
        if (!c.found) {
          return (
            <td key={c.slug} className="px-4 py-3 align-top text-[color:var(--muted-2)]">
              нет публичной оценки
            </td>
          );
        }
        const v = value(c);
        const isBest = best !== null && v !== null && Math.round(v) === Math.round(best);
        return (
          <td
            key={c.slug}
            className={`px-4 py-3 align-top ${strong ? 'text-2xl font-semibold tabular-nums' : ''} ${
              isBest ? 'bg-[color:var(--panel)] font-semibold' : ''
            }`}
          >
            {render(c)}
          </td>
        );
      })}
    </tr>
  );
}

function GroupRow({ label, span }: { label: string; span: number }) {
  return (
    <tr className="bg-[color:var(--paper-2)]">
      <th colSpan={span + 1} className="px-4 py-2 text-left text-xs font-normal uppercase tracking-widest text-[color:var(--muted)]">
        {label}
      </th>
    </tr>
  );
}

function reviewShare(e: ExtraAnalytics): number | null {
  const r = e.reviews;
  if (!r?.available || r.sampledPrs === 0) return null;
  return Math.round((r.reviewedPrs / r.sampledPrs) * 100);
}

function compareHref(slugs: string[]): string {
  const q = new URLSearchParams();
  for (const s of slugs) q.append('r', s);
  const qs = q.toString();
  return qs ? `/compare?${qs}` : '/compare';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { timeZone: APP_TIME_ZONE, year: 'numeric', month: 'short', day: 'numeric' });
}
