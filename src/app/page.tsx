// Главная — hero с формой запуска и рейтинг опубликованных анализов.

import Link from 'next/link';
import { AnalyzeForm } from './components/AnalyzeForm';
import { Planet } from './components/Planet';
import { Bar, Chip, EmptyState } from './components/ui';
import { getLanguageFacets, getLeaderboard, type LeaderboardSort } from '@/lib/ranking';
import { CATEGORY_ACCENT_CLASS, CATEGORY_TITLES } from '@/lib/category-meta';

export const revalidate = 60;

type Search = { sort?: string; q?: string; lang?: string | string[]; page?: string };

const PAGE_SIZE = 20;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const sort: LeaderboardSort = sp.sort === 'forks' ? 'forks' : 'score';
  const query = sp.q?.trim() || undefined;
  const languages = normalizeLanguages(sp.lang);
  const page = Math.max(1, Number.parseInt(sp.page ?? '', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ items, total }, facets] = await Promise.all([
    getLeaderboard({ sort, query, languages, limit: PAGE_SIZE, offset }),
    getLanguageFacets(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (patch: {
    sort?: string;
    q?: string;
    languages?: string[];
    page?: string;
  }): string => {
    const params = new URLSearchParams();
    const nextSort = patch.sort ?? sort;
    if (nextSort && nextSort !== 'score') params.set('sort', nextSort);
    const nextQ = patch.q ?? query;
    if (nextQ) params.set('q', nextQ);
    for (const lang of patch.languages ?? languages) params.append('lang', lang);
    const nextPage = patch.page ?? String(page);
    if (nextPage && nextPage !== '1') params.set('page', nextPage);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6">
      {/* Hero */}
      <section className="relative pt-14 pb-16 sm:pt-20 sm:pb-20">
        {/* Планета уходит за текст: она полутоновая и читать не мешает.
            Опущена на четверть своей высоты — так она садится на строку
            заголовка, а не висит над ней. */}
        <div className="float pointer-events-none absolute -right-24 top-[34px] -z-10 hidden opacity-90 sm:block">
          <Planet size={520} variant="backdrop" />
        </div>
        <div className="max-w-3xl">
          <h1 className="rise text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Оценка здоровья
            <br />
            репозиториев SourceCraft.
          </h1>
          <p className="rise mt-5 max-w-xl text-lg leading-relaxed text-[color:var(--muted)]" style={{ animationDelay: '60ms' }}>
            Введите{' '}
            <code className="rounded-md bg-[color:var(--panel)] px-1.5 py-0.5 font-mono text-[0.9em] text-[color:var(--ink)]">
              org/repo
            </code>{' '}
            — получите оценку 0–100 по четырём категориям, объяснение и конкретные шаги для роста.
          </p>

          <div
            className="rise mt-8 max-w-2xl rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper)] p-4 shadow-[var(--shadow-2)]"
            style={{ animationDelay: '120ms' }}
          >
            <AnalyzeForm />
          </div>

          <div
            className="rise mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[color:var(--muted)]"
            style={{ animationDelay: '180ms' }}
          >
            {(['activity', 'code', 'security', 'docs'] as const).map((key) => (
              <span key={key} className={`${CATEGORY_ACCENT_CLASS[key]} inline-flex items-center gap-2`}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  aria-hidden
                />
                {CATEGORY_TITLES[key]}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="hairline h-px" />

      {/* Рейтинг */}
      <section className="py-14 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Рейтинг</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Опубликованные анализы. Полезные материалы идут после проектов — их не оцениваем.
            </p>
          </div>
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
            title={languages.length > 0 || query ? 'Ничего не нашлось' : 'Пока пусто'}
            hint={
              languages.length > 0 || query
                ? 'Снимите фильтры или измените запрос.'
                : 'Первый опубликованный анализ появится здесь.'
            }
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
          <ol className="mt-8 divide-y divide-[color:var(--line)]">
            {items.map((item, idx) => (
              <li key={item.id} className="rise" style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}>
                <Link
                  href={`/r/${item.org}/${item.repo}`}
                  className="group flex items-center gap-5 py-4 transition hover:bg-[color:var(--paper-2)]"
                >
                  <span className="w-8 text-right text-sm tabular-nums text-[color:var(--muted)]">
                    {String(offset + idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-base font-medium tracking-tight transition-transform duration-200 group-hover:translate-x-0.5 group-hover:underline">
                        {item.org}
                        <span className="text-[color:var(--muted-2)]">/</span>
                        {item.repo}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--muted)]">
                      {item.kind === 'material' && (
                        <span className="rounded-full border border-[color:var(--line)] px-2 py-0.5">
                          материал
                        </span>
                      )}
                      <span>{item.language ?? 'Язык не определён'}</span>
                      {item.forks != null && (
                        <span className="inline-flex items-center gap-1">
                          <ForkIcon /> {item.forks.toLocaleString('ru-RU')}
                        </span>
                      )}
                      {item.publishedAt && <span>· {formatDate(item.publishedAt)}</span>}
                    </div>
                  </div>
                  <div className="hidden w-40 sm:block">
                    {item.kind !== 'material' && <Bar value={item.score} />}
                  </div>
                  <div className="w-14 text-right text-2xl font-semibold tabular-nums">
                    {item.kind === 'material' ? (
                      <span className="text-xs font-normal uppercase tracking-widest text-[color:var(--muted-2)]">
                        мат.
                      </span>
                    ) : (
                      (item.score ?? '—')
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-between text-sm text-[color:var(--muted)]">
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

// ---------- фильтры рейтинга ----------

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
    <form className="mt-6 flex flex-wrap items-start gap-2 text-sm">
      <input
        type="text"
        name="q"
        defaultValue={query ?? ''}
        placeholder="Поиск по имени репозитория"
        aria-label="Поиск по имени репозитория"
        className="min-w-0 flex-1 rounded-full bg-[color:var(--panel)] px-4 py-2.5 outline-none transition focus:ring-2 focus:ring-[color:var(--ink)]"
      />

      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-[color:var(--panel)] px-4 py-2.5 transition hover:bg-[color:var(--panel-2)]">
          <span>
            Язык
            {languages.length > 0 && (
              <span className="ml-1 text-[color:var(--muted)]">· {languages.length}</span>
            )}
          </span>
          <ChevronIcon />
        </summary>

        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] p-3 shadow-[var(--shadow-2)]">
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
                    <span className="text-xs tabular-nums text-[color:var(--muted-2)]">
                      {facet.count}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-1.5 text-xs text-[color:var(--muted)]">
              Языков пока нет — рейтинг пуст.
            </p>
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

function SortLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
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

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
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

function ForkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <circle cx="4" cy="3" r="1.75" />
      <circle cx="12" cy="3" r="1.75" />
      <circle cx="8" cy="13" r="1.75" />
      <path d="M4 5v2c0 1 .5 1.5 1.5 1.5h5C11.5 8.5 12 8 12 7V5M8 9v2.5" />
    </svg>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
}
