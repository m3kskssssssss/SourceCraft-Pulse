// Рейтинг опубликованных анализов: сводка по всем репозиториям, фильтры,
// подиум и полный список со страницами. На главной — только превью.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Podium, LeaderboardRows } from '../components/Leaderboard';
import { RatingOverview } from '../components/RatingOverview';
import { Chip, EmptyState } from '../components/ui';
import {
  getLanguageFacets,
  getLeaderboard,
  getLeaderboardOverview,
  getUnrankedCount,
  type LeaderboardSort,
} from '@/lib/ranking';
import { db } from '@/db/client';
import { getCatalogStats } from '@/lib/catalog';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Рейтинг — Pulse',
  description: 'Все опубликованные оценки репозиториев SourceCraft: баллы, категории, отзывы людей.',
};

type Search = { sort?: string; q?: string; lang?: string | string[]; page?: string };

const PAGE_SIZE = 30;

export default async function RatingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const sort: LeaderboardSort = sp.sort === 'forks' ? 'forks' : 'score';
  const query = sp.q?.trim() || undefined;
  const languages = normalizeLanguages(sp.lang);
  const page = Math.max(1, Number.parseInt(sp.page ?? '', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const filtered = Boolean(query || languages.length);

  const [{ items, total }, facets, overview, unranked, catalog] = await Promise.all([
    getLeaderboard({ sort, query, languages, limit: PAGE_SIZE, offset }),
    getLanguageFacets(),
    getLeaderboardOverview(),
    getUnrankedCount(),
    // Каталог может быть ещё не обойдён (или миграция не применена) — тогда без счётчика.
    getCatalogStats(db).catch(() => null),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Первая тройка на первой странице без фильтров показывается карточками:
  // рейтинг должен начинаться с лиц, а не сразу с однообразного списка.
  const podium = sort === 'score' && page === 1 && !filtered && items.length >= 3 ? items.slice(0, 3) : [];
  const rows = podium.length > 0 ? items.slice(3) : items;

  const buildHref = (patch: { sort?: string; q?: string; languages?: string[]; page?: string }): string => {
    const params = new URLSearchParams();
    const nextSort = patch.sort ?? sort;
    if (nextSort && nextSort !== 'score') params.set('sort', nextSort);
    const nextQ = patch.q ?? query;
    if (nextQ) params.set('q', nextQ);
    for (const lang of patch.languages ?? languages) params.append('lang', lang);
    const nextPage = patch.page ?? String(page);
    if (nextPage && nextPage !== '1') params.set('page', nextPage);
    const qs = params.toString();
    return qs ? `/rating?${qs}` : '/rating';
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <section className="pt-10 pb-8 sm:pt-16">
        <h1 className="rise text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">Рейтинг</h1>
        <p className="rise mt-4 max-w-2xl text-lg leading-relaxed text-[color:var(--muted)]" style={{ animationDelay: '60ms' }}>
          Публичные репозитории SourceCraft с опубликованной оценкой. У каждого — балл здоровья,
          разбивка по шести категориям и отзывы людей.
        </p>
        {(catalog || unranked > 0) && (
          <p className="rise mt-3 max-w-2xl text-sm text-[color:var(--muted)]" style={{ animationDelay: '90ms' }}>
            {catalog && (
              <>
                Оценено <span className="tabular-nums text-[color:var(--ink-2)]">{catalog.analyzed.toLocaleString('ru-RU')}</span>{' '}
                из <span className="tabular-nums text-[color:var(--ink-2)]">{catalog.eligible.toLocaleString('ru-RU')}</span>{' '}
                публичных проектов каталога SourceCraft (всего в каталоге{' '}
                {catalog.total.toLocaleString('ru-RU')}, без форков, зеркал, шаблонов и пустых).{' '}
              </>
            )}
            {unranked > 0 && (
              <>
                Ещё {unranked.toLocaleString('ru-RU')} оценены, но без места: форки, зеркала и копии шаблонов.{' '}
              </>
            )}
            <Link href="/methodology" className="underline">
              Как считается балл
            </Link>
          </p>
        )}
      </section>

      {overview.total > 0 && <RatingOverview overview={overview} facets={facets.slice(0, 8)} />}

      <section className="py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {filtered ? 'Найдено' : 'Все репозитории'}{' '}
            <span className="tabular-nums text-[color:var(--muted-2)]">{total}</span>
          </h2>
          <div className="flex items-center gap-1 rounded-full bg-[color:var(--panel)] p-1 text-sm">
            <SortLink href={buildHref({ sort: 'score', page: '1' })} active={sort === 'score'}>
              По оценке
            </SortLink>
            <SortLink href={buildHref({ sort: 'forks', page: '1' })} active={sort === 'forks'}>
              По популярности
            </SortLink>
          </div>
        </div>

        <LeaderboardFilters
          query={query}
          languages={languages}
          facets={facets}
          sort={sort}
          clearHref={buildHref({ q: '', languages: [], page: '1' })}
        />

        {items.length === 0 ? (
          <EmptyState
            className="mt-10"
            title={filtered ? 'Ничего не нашлось' : 'Пока пусто'}
            hint={filtered ? 'Снимите фильтры или измените запрос.' : 'Первый опубликованный анализ появится здесь.'}
            action={
              <Link
                href="/analyze"
                className="mt-2 rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
              >
                Оценить репозиторий
              </Link>
            }
          />
        ) : (
          <>
            {podium.length > 0 && <Podium items={podium} />}
            <LeaderboardRows items={rows} startPlace={offset + podium.length + 1} />
          </>
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted)]">
            <div>
              Страница <span className="text-[color:var(--ink)]">{page}</span> из{' '}
              <span className="text-[color:var(--ink)]">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <PageLink href={buildHref({ page: String(page - 1) })} disabled={page <= 1}>
                ← Назад
              </PageLink>
              <PageLink href={buildHref({ page: String(page + 1) })} disabled={page >= totalPages}>
                Вперёд →
              </PageLink>
            </div>
          </nav>
        )}
      </section>
    </main>
  );
}

// ---------- фильтры ----------

/**
 * Поиск и фильтр по языкам. Всё на обычной GET-форме без клиентского JS:
 * чекбоксы и поле «свой язык» носят одно имя `lang`, поэтому приходят одним
 * массивом и обрабатываются единообразно.
 */
function LeaderboardFilters({
  query,
  languages,
  facets,
  sort,
  clearHref,
}: {
  query?: string;
  languages: string[];
  facets: Array<{ name: string; count: number }>;
  sort: LeaderboardSort;
  clearHref: string;
}) {
  const selected = new Set(languages);
  const custom = languages.filter((l) => !facets.some((f) => f.name === l));
  const hasFilters = languages.length > 0 || Boolean(query);

  return (
    <form action="/rating" className="mt-6 flex flex-wrap items-start gap-2 text-sm">
      <input
        type="text"
        name="q"
        defaultValue={query ?? ''}
        placeholder="Поиск по имени репозитория"
        aria-label="Поиск по имени репозитория"
        className="min-w-0 flex-1 basis-full rounded-full bg-[color:var(--panel)] px-4 py-2.5 outline-none transition focus:ring-2 focus:ring-[color:var(--ink)] sm:basis-0"
      />

      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-[color:var(--panel)] px-4 py-2.5 transition hover:bg-[color:var(--panel-2)]">
          <span>
            Язык
            {languages.length > 0 && <span className="ml-1 text-[color:var(--muted)]">· {languages.length}</span>}
          </span>
          <ChevronIcon />
        </summary>

        <div className="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] p-3 shadow-[var(--shadow-2)] sm:left-auto sm:right-0">
          {facets.length > 0 ? (
            <ul className="max-h-64 space-y-0.5 overflow-y-auto">
              {facets.map((facet) => (
                <li key={facet.name}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[color:var(--panel)]">
                    <input
                      type="checkbox"
                      name="lang"
                      value={facet.name}
                      defaultChecked={selected.has(facet.name)}
                      className="h-4 w-4 accent-[color:var(--ink)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{facet.name}</span>
                    <span className="text-xs tabular-nums text-[color:var(--muted-2)]">{facet.count}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-1.5 text-xs text-[color:var(--muted)]">Языков пока нет — рейтинг пуст.</p>
          )}

          <div className="mt-2 border-t border-[color:var(--line)] pt-2">
            <input
              type="text"
              name="lang"
              defaultValue={custom[0] ?? ''}
              placeholder="Свой язык"
              aria-label="Свой язык"
              className="w-full rounded-xl bg-[color:var(--panel)] px-3 py-2 outline-none transition focus:ring-2 focus:ring-[color:var(--ink)]"
            />
          </div>
        </div>
      </details>

      {sort !== 'score' && <input type="hidden" name="sort" value={sort} />}

      <button
        type="submit"
        className="rounded-full bg-[color:var(--ink)] px-4 py-2.5 text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
      >
        Найти
      </button>

      {hasFilters && (
        <Link
          href={clearHref}
          className="rounded-full border border-[color:var(--line)] px-4 py-2.5 text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel)]"
        >
          Сбросить
        </Link>
      )}

      {languages.length > 0 && (
        <div className="mt-1 flex w-full flex-wrap gap-1.5">
          {languages.map((lang) => (
            <Chip key={lang} tone="outline">
              {lang}
            </Chip>
          ))}
        </div>
      )}
    </form>
  );
}

/** `lang` приходит строкой или массивом; чистим пустые и дубли. */
function normalizeLanguages(raw: string | string[] | undefined): string[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cleaned = list.map((l) => l.trim()).filter(Boolean);
  return [...new Set(cleaned)].slice(0, 20);
}

function SortLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-full bg-[color:var(--ink)] px-3 py-1.5 text-[color:var(--paper)]'
          : 'rounded-full px-3 py-1.5 text-[color:var(--muted)] transition hover:text-[color:var(--ink)]'
      }
    >
      {children}
    </Link>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span className="rounded-full border border-[color:var(--line)] px-4 py-1.5 text-[color:var(--muted-2)]">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-full border border-[color:var(--line)] px-4 py-1.5 text-[color:var(--ink)] transition hover:bg-[color:var(--panel)]"
    >
      {children}
    </Link>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="transition-transform duration-200 group-open:rotate-180"
      aria-hidden
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
