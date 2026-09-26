// Статьи о здоровье репозиториев. Фильтры живут в URL — ссылкой с фильтром
// можно поделиться, и всё работает без JS: уровни и время — ссылки-переключатели,
// поиск — обычная GET-форма.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '../components/learn/ArticleCard';
import { EmptyState, cx } from '../components/ui';
import { listArticles } from '@/lib/learn';
import { TIME_BUCKETS, TIME_BUCKET_LABEL, type TimeBucket } from '@/lib/learn/reading-time';
import { LEVELS, LEVEL_LABEL, TOPICS, type Level, type Topic } from '@/lib/learn/types';
import { CATEGORY_ACCENT_CLASS, CATEGORY_TITLES } from '@/lib/category-meta';

export const metadata: Metadata = {
  title: 'Статьи — Pulse',
  description: 'Как держать репозиторий здоровым: код, документация, активность и безопасность. Для Junior, Middle и Senior.',
};

type Search = { q?: string; level?: string | string[]; topic?: string | string[]; time?: string };

function parseLevels(raw: Search['level']): Level[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return LEVELS.filter((l) => list.includes(l));
}

function parseTopics(raw: Search['topic']): Topic[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return TOPICS.filter((t) => list.includes(t));
}

function parseTime(raw: string | undefined): TimeBucket | undefined {
  return TIME_BUCKETS.find((t) => t === raw);
}

export default async function LearnPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const levels = parseLevels(sp.level);
  const topics = parseTopics(sp.topic);
  const time = parseTime(sp.time);
  const articles = listArticles({ q, levels, topics, time });

  const href = (patch: { levels?: Level[]; topics?: Topic[]; time?: TimeBucket | null }): string => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    for (const t of patch.topics ?? topics) params.append('topic', t);
    for (const l of patch.levels ?? levels) params.append('level', l);
    const nextTime = patch.time === null ? undefined : (patch.time ?? time);
    if (nextTime) params.set('time', nextTime);
    const qs = params.toString();
    return qs ? `/learn?${qs}` : '/learn';
  };
  const toggleLevel = (l: Level): Level[] => (levels.includes(l) ? levels.filter((x) => x !== l) : [...levels, l]);
  const toggleTopic = (t: Topic): Topic[] => (topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t]);
  const filtered = Boolean(q || levels.length || topics.length || time);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <section className="pt-12 pb-8 sm:pt-16">
        <h1 className="rise text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">Статьи</h1>
        <p className="rise mt-4 max-w-2xl text-lg leading-relaxed text-[color:var(--muted)]" style={{ animationDelay: '60ms' }}>
          Как держать репозиторий здоровым: код, документация, активность и безопасность — те же четыре
          категории, по которым Pulse ставит оценку.
        </p>
      </section>

      <form action="/learn" className="flex flex-col gap-2 text-sm sm:flex-row">
        {topics.map((t) => <input key={t} type="hidden" name="topic" value={t} />)}
        {levels.map((l) => <input key={l} type="hidden" name="level" value={l} />)}
        {time && <input type="hidden" name="time" value={time} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Поиск по статьям"
          aria-label="Поиск по статьям"
          className="min-w-0 flex-1 rounded-full bg-[color:var(--panel)] px-4 py-2.5 outline-none transition focus:ring-2 focus:ring-[color:var(--ink)]"
        />
        <button
          type="submit"
          className="rounded-full bg-[color:var(--ink)] px-5 py-2.5 font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
        >
          Найти
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <FilterRow label="Тема">
          <Toggle href={href({ topics: [] })} active={topics.length === 0}>Все</Toggle>
          {TOPICS.map((t) => (
            <Toggle key={t} href={href({ topics: toggleTopic(t) })} active={topics.includes(t)} accent={CATEGORY_ACCENT_CLASS[t]}>
              {CATEGORY_TITLES[t]}
            </Toggle>
          ))}
        </FilterRow>
        <FilterRow label="Уровень">
          <Toggle href={href({ levels: [] })} active={levels.length === 0}>Все</Toggle>
          {LEVELS.map((l) => (
            <Toggle key={l} href={href({ levels: toggleLevel(l) })} active={levels.includes(l)}>
              {LEVEL_LABEL[l]}
            </Toggle>
          ))}
        </FilterRow>
        <FilterRow label="Время">
          <Toggle href={href({ time: null })} active={!time}>Любое</Toggle>
          {TIME_BUCKETS.map((t) => (
            <Toggle key={t} href={href({ time: t === time ? null : t })} active={t === time}>
              {TIME_BUCKET_LABEL[t]}
            </Toggle>
          ))}
        </FilterRow>
        {filtered && (
          <Link href="/learn" className="text-[color:var(--muted)] underline underline-offset-4 hover:text-[color:var(--ink)]">
            Сбросить
          </Link>
        )}
      </div>

      {articles.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => <ArticleCard key={a.slug} article={a} />)}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          title="Ничего не нашлось"
          hint="Попробуйте другое слово или снимите часть фильтров."
          action={<Link href="/learn" className="text-sm underline underline-offset-4">Показать все статьи</Link>}
        />
      )}
    </main>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[color:var(--muted)]">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  href,
  active,
  accent,
  children,
}: {
  href: string;
  active: boolean;
  /** Класс акцента категории: у темы — цветная точка перед подписью. */
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition',
        accent,
        active
          ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
          : 'bg-[color:var(--panel)] text-[color:var(--ink-2)] hover:bg-[color:var(--panel-2)]',
      )}
    >
      {accent && <span aria-hidden className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />}
      {children}
    </Link>
  );
}
