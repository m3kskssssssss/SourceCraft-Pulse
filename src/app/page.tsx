// Главная — hero с формой запуска и рейтинг опубликованных анализов.

import Link from 'next/link';
import { AnalyzeForm } from './components/AnalyzeForm';
import { Bar, Chip, EmptyState } from './components/ui';
import { getLeaderboard, type LeaderboardSort } from '@/lib/ranking';

export const revalidate = 60;

type Search = { sort?: string; q?: string; lang?: string; page?: string };

const PAGE_SIZE = 20;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const sort: LeaderboardSort = sp.sort === 'forks' ? 'forks' : 'score';
  const query = sp.q?.trim() || undefined;
  const language = sp.lang?.trim() || undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? '', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { items, total } = await getLeaderboard({
    sort,
    query,
    language,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (patch: Partial<Search>): string => {
    const params = new URLSearchParams();
    const nextSort = patch.sort ?? sort;
    if (nextSort && nextSort !== 'score') params.set('sort', nextSort);
    const nextQ = patch.q ?? query;
    if (nextQ) params.set('q', nextQ);
    const nextLang = patch.lang ?? language;
    if (nextLang) params.set('lang', nextLang);
    const nextPage = patch.page ?? String(page);
    if (nextPage && nextPage !== '1') params.set('page', nextPage);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6">
      {/* Hero */}
      <section className="relative pt-14 pb-16 sm:pt-20 sm:pb-20">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden />
        <div className="max-w-3xl">
          <Chip tone="outline" className="mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ink)]" />
            хакатон · открытая бета
          </Chip>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Оценка здоровья
            <br />
            репозиториев SourceCraft.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[color:var(--muted)]">
            Введите <code className="rounded-md bg-[color:var(--panel)] px-1.5 py-0.5 font-mono text-[0.9em] text-[color:var(--ink)]">org/repo</code>{' '}
            — получите оценку 0–100 по четырём категориям, объяснение и конкретные шаги для роста.
          </p>

          <div className="mt-8 max-w-2xl rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper)] p-4 shadow-[var(--shadow-2)]">
            <AnalyzeForm />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[color:var(--muted)]">
            <span className="inline-flex items-center gap-2">
              <Dot /> активность
            </span>
            <span className="inline-flex items-center gap-2">
              <Dot /> код
            </span>
            <span className="inline-flex items-center gap-2">
              <Dot /> безопасность
            </span>
            <span className="inline-flex items-center gap-2">
              <Dot /> документация
            </span>
          </div>
        </div>
      </section>

      <div className="hairline h-px" />

      {/* Leaderboard */}
      <section className="py-14 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Рейтинг</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Публичные анализы, отсортированные по оценке. Автор не публикуется.
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

        <form className="mt-6 flex flex-wrap gap-2 text-sm">
          <input
            type="text"
            name="q"
            defaultValue={query ?? ''}
            placeholder="Поиск по имени репозитория"
            className="min-w-0 flex-1 rounded-full bg-[color:var(--panel)] px-4 py-2.5 outline-none focus:ring-2 focus:ring-[color:var(--ink)]"
          />
          <input
            type="text"
            name="lang"
            defaultValue={language ?? ''}
            placeholder="Язык"
            className="w-36 rounded-full bg-[color:var(--panel)] px-4 py-2.5 outline-none focus:ring-2 focus:ring-[color:var(--ink)]"
          />
          {sort !== 'score' && <input type="hidden" name="sort" value={sort} />}
          <button
            type="submit"
            className="rounded-full bg-[color:var(--ink)] px-4 py-2.5 text-[color:var(--paper)] hover:bg-[color:var(--ink-2)]"
          >
            Найти
          </button>
        </form>

        {items.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="Пока пусто"
            hint="Как только появится первый опубликованный анализ, он окажется здесь. Оцените репозиторий и включите публикацию — попадёте в рейтинг."
            action={
              <Link
                href="/analyze"
                className="mt-2 rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)]"
              >
                Оценить репозиторий
              </Link>
            }
          />
        ) : (
          <ol className="mt-8 divide-y divide-[color:var(--line)]">
            {items.map((item, idx) => (
              <li key={item.id}>
                <Link
                  href={`/r/${item.org}/${item.repo}`}
                  className="group flex items-center gap-5 py-4 transition hover:bg-[color:var(--paper-2)]"
                >
                  <span className="w-8 text-right text-sm tabular-nums text-[color:var(--muted)]">
                    {String(offset + idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-base font-medium tracking-tight group-hover:underline">
                        {item.org}
                        <span className="text-[color:var(--muted-2)]">/</span>
                        {item.repo}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--muted)]">
                      <span>{item.language ?? 'язык не определён'}</span>
                      {item.forks != null && (
                        <span className="inline-flex items-center gap-1">
                          <ForkIcon /> {item.forks.toLocaleString('ru-RU')}
                        </span>
                      )}
                      {item.publishedAt && <span>· {formatDate(item.publishedAt)}</span>}
                    </div>
                  </div>
                  <div className="hidden w-40 sm:block">
                    <Bar value={item.score} />
                  </div>
                  <div className="w-14 text-right text-2xl font-semibold tabular-nums">
                    {item.score ?? '—'}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-between text-sm text-[color:var(--muted)]">
            <div>
              стр. <span className="text-[color:var(--ink)]">{page}</span> из{' '}
              <span className="text-[color:var(--ink)]">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <PageLink href={buildHref({ page: String(page - 1) })} disabled={page <= 1}>
                ← предыдущая
              </PageLink>
              <PageLink
                href={buildHref({ page: String(page + 1) })}
                disabled={page >= totalPages}
              >
                следующая →
              </PageLink>
            </div>
          </nav>
        )}
      </section>
    </main>
  );
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
          : 'rounded-full px-3 py-1.5 text-[color:var(--muted)] hover:text-[color:var(--ink)]'
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
      className="rounded-full border border-[color:var(--line)] px-4 py-1.5 text-[color:var(--ink)] hover:bg-[color:var(--panel)]"
    >
      {children}
    </Link>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ink)]" />;
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
