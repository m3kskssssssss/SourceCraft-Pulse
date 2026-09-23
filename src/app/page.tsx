// Главная — hero с формой запуска и рейтинг опубликованных анализов.

import Link from 'next/link';
import { AnalyzeForm } from './components/AnalyzeForm';
import { Planet } from './components/Planet';
import { CategoryMini, Chip, CommentIcon, EmptyState, StarIcon } from './components/ui';
import {
  getLanguageFacets,
  getLeaderboard,
  type LeaderboardItem,
  type LeaderboardSort,
} from '@/lib/ranking';
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

  // Первая тройка на первой странице показывается карточками: рейтинг должен
  // начинаться с лиц, а не сразу с однообразного списка.
  const podium = sort === 'score' && page === 1 && items.length >= 3 ? items.slice(0, 3) : [];
  const rows = podium.length > 0 ? items.slice(3) : items;

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
            Смещение подобрано на глаз: опущена от верха секции, но сдвинута
            влево и вверх на 20 пикселей относительно прежнего положения. */}
        <div className="float pointer-events-none absolute -right-[76px] top-[14px] -z-10 hidden opacity-90 sm:block">
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
          <>
            {podium.length > 0 && (
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {podium.map((item, idx) => (
                  // Карточка — не ссылка, а контейнер: внутри живёт своя
                  // ссылка на обсуждение, а <a> внутри <a> не бывает. Клик по
                  // карточке ловит растянутая ссылка под содержимым.
                  <div
                    key={item.id}
                    // @container: шкалы категорий внутри перестраиваются по
                    // ширине самой карточки, а не окна — в три колонки она
                    // узкая даже на большом экране.
                    className="rise group @container pointer-events-none relative flex flex-col rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-4 transition hover:border-[color:var(--line-2)] hover:shadow-[var(--shadow-2)] sm:p-5"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <Link
                      href={`/r/${item.org}/${item.repo}`}
                      aria-label={`${item.org}/${item.repo}`}
                      className="pointer-events-auto absolute inset-0 rounded-3xl"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-widest text-[color:var(--muted)]">
                        {idx === 0 ? 'Лидер' : `№ ${idx + 1}`}
                      </span>
                      {item.kind === 'material' ? (
                        // На тесной карточке кегль меньше: в три колонки
                        // «Полезный материал» в 24 пикселя не помещается.
                        <span className="max-w-[9rem] text-right text-lg font-semibold leading-tight tracking-tight @[18rem]:text-2xl">
                          Полезный материал
                        </span>
                      ) : (
                        <span className="text-3xl font-semibold leading-none tabular-nums @[18rem]:text-4xl">
                          {item.score ?? '—'}
                        </span>
                      )}
                    </div>
                    <div className="mt-5 truncate text-[15px] font-medium tracking-tight group-hover:underline">
                      <span className="text-[color:var(--muted)]">{item.org}/</span>
                      {item.repo}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[color:var(--muted)]">
                      <span className="min-w-0 truncate">
                        {item.language ?? 'Язык не определён'}
                      </span>
                      {item.forks != null && (
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <ForkIcon /> {item.forks.toLocaleString('ru-RU')}
                        </span>
                      )}
                    </div>
                    <SocialLine item={item} className="relative mt-2" />
                    {item.kind !== 'material' && (
                      <CategoryMini values={item.categories} size="md" className="mt-5" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <ol className="mt-8 divide-y divide-[color:var(--line)]">
              {rows.map((item, idx) => {
                const place = offset + idx + 1 + podium.length;
                const isMaterial = item.kind === 'material';
                return (
                  <li
                    key={item.id}
                    className="rise"
                    style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}
                  >
                    {/* На телефоне колонки номера нет: она сдвигала весь список
                        вправо относительно заголовка. Номер уходит в строку
                        названия, а с sm возвращается своей колонкой.
                        Сама строка — не ссылка: внутри есть ссылка к
                        обсуждению. Клик по строке ловит растянутая ссылка. */}
                    <div
                      className={`group pointer-events-none relative -mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-2xl px-3 py-4 transition hover:bg-[color:var(--paper-2)] sm:grid-cols-[1.75rem_minmax(0,1fr)_auto] sm:gap-x-5 ${
                        isMaterial ? '' : 'lg:grid-cols-[1.75rem_minmax(0,1fr)_auto_3rem]'
                      }`}
                    >
                      <Link
                        href={`/r/${item.org}/${item.repo}`}
                        aria-label={`${item.org}/${item.repo}`}
                        className="pointer-events-auto absolute inset-0 rounded-2xl"
                      />
                      <span className="hidden self-start pt-0.5 text-center text-xs tabular-nums text-[color:var(--muted-2)] sm:col-start-1 sm:row-start-1 sm:block">
                        {place}
                      </span>

                      <div className="col-start-1 row-start-1 min-w-0 sm:col-start-2">
                        <div className="truncate text-[15px] font-medium tracking-tight transition-transform duration-200 group-hover:translate-x-0.5">
                          <span className="tabular-nums text-[color:var(--muted-2)] sm:hidden">
                            {place}.{' '}
                          </span>
                          <span className="text-[color:var(--muted)]">{item.org}/</span>
                          <span className="group-hover:underline">{item.repo}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[color:var(--muted)]">
                          {/* На телефоне пометка живёт здесь, на экране — крупно
                              справа, на месте балла. Дублировать незачем. */}
                          {isMaterial && (
                            <span className="rounded-full border border-[color:var(--line)] px-2 py-0.5 text-[color:var(--ink-2)] sm:hidden">
                              Полезный материал
                            </span>
                          )}
                          <span className="truncate">{item.language ?? 'Язык не определён'}</span>
                          {item.forks != null && (
                            <span className="inline-flex items-center gap-1">
                              <ForkIcon /> {item.forks.toLocaleString('ru-RU')}
                            </span>
                          )}
                          {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
                        </div>
                        <SocialLine item={item} className="relative mt-1.5" />
                      </div>

                      {!isMaterial && (
                        <CategoryMini
                          values={item.categories}
                          className="col-span-2 col-start-1 row-start-2 mt-2.5 sm:col-start-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:mt-0"
                        />
                      )}

                      {isMaterial ? (
                        // Тем же кеглем, что балл у проектов, и только с sm:
                        // на телефоне пометка уже стоит под названием.
                        <span className="hidden w-36 self-start text-right text-2xl font-semibold leading-tight tracking-tight sm:col-start-3 sm:row-start-1 sm:block">
                          Полезный материал
                        </span>
                      ) : (
                        <span className="col-start-2 row-start-1 self-start pt-0.5 text-right text-xl font-semibold tabular-nums sm:col-start-3 sm:text-2xl lg:col-start-4">
                          {item.score ?? '—'}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
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

/**
 * Отклик людей на разбор: средняя оценка и число комментариев.
 *
 * Комментарии — отдельная ссылка прямо к обсуждению. Она лежит внутри
 * карточки, которая сама ссылка, поэтому клик по ней приходится останавливать
 * разметкой: вложенных <a> в HTML не бывает, и карточка на телефоне
 * перехватила бы нажатие.
 */
function SocialLine({ item, className }: { item: LeaderboardItem; className?: string }) {
  if (item.ratingCount === 0 && item.commentCount === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className ?? ''}`}>
      {item.ratingCount > 0 && (
        <span className="inline-flex items-center gap-1 text-[color:var(--ink-2)]">
          <StarIcon />
          <span className="tabular-nums">{item.ratingAverage?.toFixed(1)}</span>
          <span className="text-[color:var(--muted-2)]">({item.ratingCount})</span>
        </span>
      )}
      {item.commentCount > 0 && (
        <Link
          href={`/a/${item.id}#comments`}
          className="pointer-events-auto inline-flex items-center gap-1 text-[color:var(--muted)] underline-offset-4 transition hover:text-[color:var(--ink)] hover:underline"
        >
          <CommentIcon />
          <span className="tabular-nums">{item.commentCount}</span>
        </Link>
      )}
    </div>
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
