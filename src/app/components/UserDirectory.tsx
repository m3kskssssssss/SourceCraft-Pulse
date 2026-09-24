// Карточки вкладки «Пользователи»: сводка, подиум и обычная карточка.

import Link from 'next/link';
import type { UserListItem, UsersOverview } from '@/lib/users';
import { Avatar } from './Avatar';
import { cx } from './ui';

/** Звания по очкам активности: от первого шага до завсегдатая. */
const RANKS = [
  { from: 60, title: 'Легенда' },
  { from: 30, title: 'Эксперт' },
  { from: 12, title: 'Знаток' },
  { from: 3, title: 'Участник' },
  { from: 0, title: 'Новичок' },
] as const;

export function rankOf(points: number): string {
  return RANKS.find((r) => points >= r.from)?.title ?? 'Новичок';
}

// ---------- сводка ----------

export function UsersOverviewTiles({ overview }: { overview: UsersOverview }) {
  const tiles = [
    { label: 'Всего людей', value: overview.total },
    { label: 'Опубликовали репозитории', value: overview.contributors },
    { label: 'Участвуют в обсуждениях', value: overview.commenters },
    { label: 'Новых за 30 дней', value: overview.newLast30 },
  ];
  return (
    <div className="rise grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--line)] lg:grid-cols-4" style={{ animationDelay: '120ms' }}>
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0 bg-[color:var(--paper-2)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="text-xs leading-snug text-[color:var(--muted)] sm:text-sm">{t.label}</div>
          <div className="mt-2 text-3xl font-semibold leading-none tabular-nums sm:text-4xl">{t.value}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- карточки ----------

export function PodiumCard({ user, place, isMe }: { user: UserListItem; place: number; isMe: boolean }) {
  return (
    <Link
      href={`/u/${user.id}`}
      className={cx(
        'group flex h-full flex-col items-center rounded-3xl border p-6 text-center transition hover:shadow-[var(--shadow-2)]',
        place === 1
          ? 'border-[color:var(--ink)] bg-[color:var(--paper)]'
          : 'border-[color:var(--line)] bg-[color:var(--paper-2)] hover:border-[color:var(--line-2)]',
      )}
    >
      <div className="flex w-full items-center justify-between text-[11px] uppercase tracking-widest text-[color:var(--muted)]">
        <span>{place === 1 ? 'Лидер' : `№ ${place}`}</span>
        {isMe && <MeBadge />}
      </div>
      <div className="relative mt-3">
        <Avatar user={user} size={76} />
        <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--ink)] text-xs font-semibold tabular-nums text-[color:var(--paper)] ring-4 ring-[color:var(--paper-2)]">
          {place}
        </span>
      </div>
      <div className="mt-4 w-full truncate text-lg font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
        {user.displayName}
      </div>
      <div className="mt-1 text-xs text-[color:var(--muted)]">
        {rankOf(user.points)} · <span className="tabular-nums">{user.points}</span> {plural(user.points, 'очко', 'очка', 'очков')}
      </div>
      <Stats user={user} className="mt-5 w-full" />
    </Link>
  );
}

export function UserCard({ user, place, isMe }: { user: UserListItem; place: number | null; isMe: boolean }) {
  return (
    <Link
      href={`/u/${user.id}`}
      className={cx(
        'group flex h-full flex-col rounded-3xl border bg-[color:var(--paper-2)] p-5 transition hover:shadow-[var(--shadow-2)]',
        isMe ? 'border-[color:var(--ink)]' : 'border-[color:var(--line)] hover:border-[color:var(--line-2)]',
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar user={user} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-medium tracking-tight group-hover:underline group-hover:underline-offset-4">
              {user.displayName}
            </span>
            {isMe && <MeBadge />}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[color:var(--muted)]">
            <span className="rounded-full border border-[color:var(--line-2)] px-1.5 py-px text-[10px] text-[color:var(--ink-2)]">
              {rankOf(user.points)}
            </span>
            <span className="truncate">{activity(user)}</span>
          </div>
        </div>
        {place !== null && (
          <span className="shrink-0 self-start text-xs tabular-nums text-[color:var(--muted-2)]">№ {place}</span>
        )}
      </div>

      {/* «О себе» — ровно две строки, чтобы карточки в ряду были одной высоты. */}
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-[color:var(--ink-2)] [overflow-wrap:anywhere]">
        {user.bio ?? <span className="text-[color:var(--muted-2)]">О себе пока ничего.</span>}
      </p>

      <Stats user={user} className="mt-4 border-t border-[color:var(--line)] pt-3" />
    </Link>
  );
}

function Stats({ user, className }: { user: UserListItem; className?: string }) {
  const stats = [
    { label: plural(user.repos, 'репозиторий', 'репозитория', 'репозиториев'), value: user.repos },
    { label: plural(user.comments, 'комментарий', 'комментария', 'комментариев'), value: user.comments },
    { label: plural(user.ratings, 'оценка', 'оценки', 'оценок'), value: user.ratings },
  ];
  return (
    <div className={cx('grid grid-cols-3 gap-2', className)}>
      {stats.map((s, i) => (
        <div key={i} className="min-w-0">
          <div className="text-xl font-semibold tabular-nums leading-none">{s.value}</div>
          <div className="mt-1 truncate text-[11px] text-[color:var(--muted)]">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function MeBadge() {
  return (
    <span className="shrink-0 rounded-full bg-[color:var(--ink)] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[color:var(--paper)]">
      Это вы
    </span>
  );
}

/** «Был активен вчера» без глагола прошедшего времени: пол человека неизвестен. */
function activity(user: UserListItem): string {
  if (!user.lastActiveAt) return `с нами с ${formatDate(user.createdAt)}`;
  const days = Math.floor((Date.now() - new Date(user.lastActiveAt).getTime()) / 86_400_000);
  if (days <= 0) return 'активность сегодня';
  if (days === 1) return 'активность вчера';
  if (days < 30) return `активность ${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
  return `активность ${formatDate(user.lastActiveAt)}`;
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = count % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
}
