// Страница статьи. Сверху — та же 8-битная сцена, что на карточке, только
// крупно; ниже — узкая колонка текста, удобная и на телефоне. В конце —
// соседние статьи, чтобы было куда пойти дальше.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleBody } from '@/app/components/learn/ArticleBody';
import { ArticleCard } from '@/app/components/learn/ArticleCard';
import { PixelScene } from '@/app/components/learn/PixelScene';
import { Chip } from '@/app/components/ui';
import { allSlugs, getArticle, listArticles } from '@/lib/learn';
import { LEVEL_LABEL } from '@/lib/learn/types';
import { CATEGORY_ACCENT_CLASS, CATEGORY_TITLES } from '@/lib/category-meta';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams(): Array<{ slug: string }> {
  return allSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  return { title: `${article.title} — Pulse`, description: article.summary };
}

export default async function ArticlePage({ params }: PageProps) {
  const article = getArticle((await params).slug);
  if (!article) notFound();

  // Сначала статьи той же темы, среди них — того же уровня, потом остальные.
  const affinity = (a: { topic: string; level: string }) =>
    Number(a.topic === article.topic) * 2 + Number(a.level === article.level);
  const more = listArticles()
    .filter((a) => a.slug !== article.slug)
    .sort((a, b) => affinity(b) - affinity(a))
    .slice(0, 3);

  const published = new Date(article.published).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
      <nav className="pt-8 text-sm text-[color:var(--muted)] sm:pt-10">
        <Link href="/learn" className="hover:text-[color:var(--ink)]">
          Статьи
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/learn?topic=${article.topic}`} className="hover:text-[color:var(--ink)]">
          {CATEGORY_TITLES[article.topic]}
        </Link>
      </nav>

      <article className="mx-auto mt-6 max-w-[720px]">
        <div className="rise overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--line)]">
          <PixelScene scene={article.scene} />
        </div>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href={`/learn?topic=${article.topic}`}>
              <Chip tone="accent" className={CATEGORY_ACCENT_CLASS[article.topic]}>
                {CATEGORY_TITLES[article.topic]}
              </Chip>
            </Link>
            <Chip tone={article.level === 'senior' ? 'ink' : 'outline'}>{LEVEL_LABEL[article.level]}</Chip>
            <span className="text-[color:var(--muted)]">{article.minutes} мин чтения</span>
            <span className="text-[color:var(--muted)]">·</span>
            <time dateTime={article.published} className="text-[color:var(--muted)]">
              {published}
            </time>
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[42px]">{article.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-[color:var(--muted)]">{article.summary}</p>
          {article.tags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/learn?q=${encodeURIComponent(tag)}`}
                    className="inline-block rounded-full bg-[color:var(--panel)] px-3 py-1 text-xs text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel-2)]"
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </header>

        <div className="mt-4 border-t border-[color:var(--line)]">
          <ArticleBody body={article.body} />
        </div>

        <div className="mt-14 flex flex-col gap-3 rounded-3xl bg-[color:var(--panel)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-[15px] leading-relaxed">Проверьте, как с этим дела в вашем репозитории.</p>
          <Link
            href="/analyze"
            className="shrink-0 rounded-full bg-[color:var(--ink)] px-5 py-2.5 text-center text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
          >
            Оценить репозиторий
          </Link>
        </div>
      </article>

      {more.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Ещё статьи</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
