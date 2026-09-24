// Пользователи: кто пользуется Pulse и насколько активно. Сверху — сводка
// по сообществу и тройка самых активных, ниже — все карточки. Карточка ведёт
// на профиль. Поиск и сортировка живут в адресе, обычной GET-формой без JS.

import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { PodiumCard, UserCard, UsersOverviewTiles } from '../components/UserDirectory';
import { EmptyState, cx } from '../components/ui';
import { getUsersOverview, listUsers, type UserListSort } from '@/lib/users';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Пользователи — Pulse',
  description: 'Люди, которые оценивают репозитории SourceCraft, комментируют и ставят оценки разборам.',
};

type Search = { q?: string; sort?: string; page?: string };

const PAGE_SIZE = 24;

export default async function UsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const query = sp.q?.trim() || undefined;
  const sort: UserListSort = sp.sort === 'new' ? 'new' : 'active';
  const page = Math.max(1, Number.parseInt(sp.page ?? '', 10) || 1);

  const [{ items, total }, overview, session] = await Promise.all([
    listUsers({ query, sort, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getUsersOverview(),
    auth(),
  ]);
  const viewerId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Подиум — только на первой странице самых активных и без поиска, и только
  // если у тройки вообще есть активность: «лидеры» с нулём очков смешны.
  const podium =
    sort === 'active' && page === 1 && !query && items.length >= 3 && (items[2]?.points ?? 0) > 0
      ? items.slice(0, 3)
      : [];
  const rest = podium.length ? items.slice(3) : items;

  const href = (patch: { sort?: UserListSort; page?: number }): string => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    const nextSort = patch.sort ?? sort;
    if (nextSort !== 'active') params.set('sort', nextSort);
    const nextPage = patch.page ?? 1;
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    return qs ? `/users?${qs}` : '/users';
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <section className="pt-10 pb-8 sm:pt-16">
        <h1 className="rise text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">Пользователи</h1>
        <p className="rise mt-4 max-w-2xl text-lg leading-relaxed text-[color:var(--muted)]" style={{ animationDelay: '60ms' }}>
          Кто отправляет репозитории на оценку, обсуждает разборы и ставит им оценки.
        </p>
      </section>

      <UsersOverviewTiles overview={overview} />

      {podium.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">Самые активные</h2>
          <p className="mt-1.5 text-sm text-[color:var(--muted)]">
            Очки: опубликованный репозиторий — 3, комментарий и оценка разбора — по 1.
          </p>
          {/* На телефоне тройка идёт лентой вбок: столбиком три крупные
              карточки занимали почти три экрана. */}
          <ol className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {podium.map((user, idx) => (
              <li key={user.id} className="rise w-[78%] shrink-0 snap-start sm:w-auto" style={{ animationDelay: `${idx * 60}ms` }}>
                <PodiumCard user={user} place={idx + 1} isMe={user.id === viewerId} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form action="/users" className="flex min-w-0 flex-1 gap-2 text-sm">
            {sort !== 'active' && <input type="hidden" name="sort" value={sort} />}
            <input
              type="search"
              name="q"
              defaultValue={query ?? ''}
              placeholder="Поиск по имени"
              aria-label="Поиск по имени"
              className="min-w-0 flex-1 rounded-full bg-[color:var(--panel)] px-4 py-2.5 outline-none transition focus:ring-2 focus:ring-[color:var(--ink)]"
            />
            <button
              type="submit"
              className="rounded-full bg-[color:var(--ink)] px-5 py-2.5 font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
            >
              Найти
            </button>
          </form>
          <div className="flex items-center gap-1 self-start rounded-full bg-[color:var(--panel)] p-1 text-sm sm:self-auto">
            <SortLink href={href({ sort: 'active' })} active={sort === 'active'}>
              Самые активные
            </SortLink>
            <SortLink href={href({ sort: 'new' })} active={sort === 'new'}>
              Новые
            </SortLink>
          </div>
        </div>

        <div className="mt-4 text-sm text-[color:var(--muted)]">
          {query ? 'Найдено' : 'Всего'} <span className="tabular-nums text-[color:var(--ink)]">{total}</span>
          {query && (
            <Link
              href={sort === 'new' ? '/users?sort=new' : '/users'}
              className="ml-3 underline underline-offset-4 hover:text-[color:var(--ink)]"
            >
              Сбросить
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState
            className="mt-8"
            title={query ? 'Никого не нашлось' : 'Пока никого'}
            hint={query ? 'Попробуйте другое имя.' : 'Первые пользователи появятся здесь после регистрации.'}
          />
        ) : (
          rest.length > 0 && (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((user, idx) => (
                <li key={user.id} className="rise" style={{ animationDelay: `${Math.min(idx, 12) * 25}ms` }}>
                  <UserCard
                    user={user}
                    place={sort === 'active' && !query ? (page - 1) * PAGE_SIZE + podium.length + idx + 1 : null}
                    isMe={user.id === viewerId}
                  />
                </li>
              ))}
            </ul>
          )
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted)]">
            <div>
              Страница <span className="text-[color:var(--ink)]">{page}</span> из{' '}
              <span className="text-[color:var(--ink)]">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <PageLink href={href({ page: page - 1 })} disabled={page <= 1}>
                ← Назад
              </PageLink>
              <PageLink href={href({ page: page + 1 })} disabled={page >= totalPages}>
                Вперёд →
              </PageLink>
            </div>
          </nav>
        )}
      </section>
    </main>
  );
}

function SortLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        'rounded-full px-3 py-1.5 transition',
        active ? 'bg-[color:var(--ink)] text-[color:var(--paper)]' : 'text-[color:var(--muted)] hover:text-[color:var(--ink)]',
      )}
    >
      {children}
    </Link>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className="rounded-full border border-[color:var(--line)] px-4 py-1.5 text-[color:var(--muted-2)]">{children}</span>;
  }
  return (
    <Link href={href} className="rounded-full border border-[color:var(--line)] px-4 py-1.5 text-[color:var(--ink)] transition hover:bg-[color:var(--panel)]">
      {children}
    </Link>
  );
}
