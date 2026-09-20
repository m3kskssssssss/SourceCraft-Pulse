// Главная — форма запуска + рейтинг опубликованных анализов.

import Link from 'next/link';
import { AnalyzeForm } from './components/AnalyzeForm';
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
    if ((patch.sort ?? sort) && (patch.sort ?? sort) !== 'score') params.set('sort', patch.sort ?? sort);
    if (patch.q ?? query) params.set('q', patch.q ?? query!);
    if (patch.lang ?? language) params.set('lang', patch.lang ?? language!);
    if (patch.page ?? String(page)) {
      const p = patch.page ?? String(page);
      if (p !== '1') params.set('page', p);
    }
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Pulse</h1>
      <p className="mt-4 text-lg text-neutral-600">
        Оценка здоровья открытых репозиториев платформы SourceCraft.
      </p>

      <section className="mt-10 rounded-3xl bg-neutral-100 p-6">
        <h2 className="text-xl font-medium">Оценить репозиторий</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Введите адрес репозитория с SourceCraft. Гостю мы сначала предложим войти.
        </p>
        <div className="mt-4">
          <AnalyzeForm />
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-medium">Рейтинг</h2>
          <div className="flex gap-2 text-sm">
            <Link
              href={buildHref({ sort: 'score', page: '1' })}
              className={sort === 'score' ? 'font-semibold' : 'text-neutral-600'}
            >
              По оценке
            </Link>
            <span className="text-neutral-300">·</span>
            <Link
              href={buildHref({ sort: 'forks', page: '1' })}
              className={sort === 'forks' ? 'font-semibold' : 'text-neutral-600'}
            >
              По популярности
            </Link>
          </div>
        </div>

        <form className="mt-4 flex gap-2 text-sm">
          <input
            type="text"
            name="q"
            defaultValue={query ?? ''}
            placeholder="Поиск по имени репозитория"
            className="flex-1 rounded-full bg-neutral-100 px-4 py-2 outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <input
            type="text"
            name="lang"
            defaultValue={language ?? ''}
            placeholder="Язык"
            className="w-32 rounded-full bg-neutral-100 px-4 py-2 outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {sort !== 'score' && <input type="hidden" name="sort" value={sort} />}
          <button
            type="submit"
            className="rounded-full bg-neutral-900 px-4 py-2 text-white"
          >
            Найти
          </button>
        </form>

        {items.length === 0 ? (
          <p className="mt-8 text-neutral-500">
            Пока пусто. Рейтинг наполнится, как только появятся первые опубликованные анализы.
          </p>
        ) : (
          <ol className="mt-6 flex flex-col divide-y divide-neutral-200">
            {items.map((item, idx) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <span className="w-8 text-right text-sm text-neutral-500">
                  {offset + idx + 1}
                </span>
                <div className="flex-1">
                  <Link
                    href={`/r/${item.org}/${item.repo}`}
                    className="font-medium tracking-tight hover:underline"
                  >
                    {item.org}/{item.repo}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    {item.language ?? 'язык не определён'}
                    {item.publishedAt ? ` · опубликовано ${formatDate(item.publishedAt)}` : ''}
                  </div>
                </div>
                <div className="text-2xl font-semibold tabular-nums">
                  {item.score ?? '—'}
                </div>
              </li>
            ))}
          </ol>
        )}

        {totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-between text-sm">
            <div>
              стр. {page} из {totalPages}
            </div>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildHref({ page: String(page - 1) })} className="underline">
                  ← предыдущая
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildHref({ page: String(page + 1) })} className="underline">
                  следующая →
                </Link>
              )}
            </div>
          </nav>
        )}
      </section>
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
}
