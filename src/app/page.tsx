// Главная — hero с формой запуска, подборка статей и превью рейтинга.
// Полный рейтинг с фильтрами и сводкой живёт на /rating.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AnalyzeForm } from './components/AnalyzeForm';
import { Planet } from './components/Planet';
import { LeaderboardRows, Podium } from './components/Leaderboard';
import { ArticleCard } from './components/learn/ArticleCard';
import { EmptyState } from './components/ui';
import { getLeaderboard } from '@/lib/ranking';
import { listArticles } from '@/lib/learn';
import { LEVELS } from '@/lib/learn/types';
import { CATEGORY_ACCENT_CLASS, CATEGORY_ORDER, CATEGORY_TITLES } from '@/lib/category-meta';

export const revalidate = 60;

type Search = { sort?: string; q?: string; lang?: string | string[]; page?: string };

/** Сколько строк рейтинга видно на главной: подиум и ещё несколько. */
const PREVIEW_SIZE = 8;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  // Рейтинг раньше жил прямо здесь, и ссылки с фильтрами (/?sort=…&lang=…)
  // уже разошлись — отправляем их на новое место.
  const sp = await searchParams;
  const legacy = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    for (const v of Array.isArray(value) ? value : value ? [value] : []) legacy.append(key, v);
  }
  if (['sort', 'q', 'lang', 'page'].some((k) => legacy.has(k))) redirect(`/rating?${legacy.toString()}`);

  const { items, total } = await getLeaderboard({ sort: 'score', limit: PREVIEW_SIZE });
  const podium = items.length >= 3 ? items.slice(0, 3) : [];
  const rows = podium.length > 0 ? items.slice(3) : items;

  // По статье каждого уровня: главная показывает, что читать есть кому угодно.
  const all = listArticles();
  const articles = LEVELS.map((level) => all.find((a) => a.level === level)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
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
            — получите оценку 0–100 по шести категориям, объяснение и конкретные шаги для роста.
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
            {CATEGORY_ORDER.map((key) => (
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

      {/* Статьи: на телефоне лентой с прокруткой вбок, на экране — тремя колонками. */}
      <section className="py-12 sm:py-16">
        <SectionTitle
          title="Статьи"
          hint="Как держать репозиторий здоровым — для Junior, Middle и Senior."
          href="/learn"
          more={`Все статьи · ${all.length}`}
        />
        <div className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0">
          {articles.map((a) => (
            <div key={a.slug} className="w-[82%] shrink-0 snap-start sm:w-auto">
              <ArticleCard article={a} />
            </div>
          ))}
        </div>
      </section>

      <div className="hairline h-px" />

      {/* Превью рейтинга: подиум и несколько строк, дальше — /rating. */}
      <section className="py-12 sm:py-16">
        <SectionTitle
          title="Рейтинг"
          hint="Лучшие по баллу здоровья среди опубликованных оценок."
          href="/rating"
          more={total > 0 ? `Весь рейтинг · ${total}` : 'Весь рейтинг'}
        />

        {items.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="Пока пусто"
            hint="Первый опубликованный анализ появится здесь."
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
            {rows.length > 0 && <LeaderboardRows items={rows} startPlace={podium.length + 1} />}
            {total > items.length && (
              <div className="mt-8 flex justify-center">
                <Link
                  href="/rating"
                  className="rounded-full border border-[color:var(--line)] px-5 py-2.5 text-sm text-[color:var(--ink)] transition hover:bg-[color:var(--panel)]"
                >
                  Смотреть весь рейтинг — ещё {total - items.length}
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function SectionTitle({ title, hint, href, more }: { title: string; hint: string; href: string; more: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-[color:var(--muted)]">{hint}</p>
      </div>
      <Link
        href={href}
        className="text-sm text-[color:var(--ink-2)] underline underline-offset-4 transition hover:text-[color:var(--ink)] hover:no-underline"
      >
        {more} →
      </Link>
    </div>
  );
}
