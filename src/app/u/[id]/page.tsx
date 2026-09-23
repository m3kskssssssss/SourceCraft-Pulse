// Публичная страница пользователя: кто это, как с ним связаться и какие
// репозитории он отправлял на оценку.
//
// Показываем только опубликованные прогоны: приватные — личное дело автора,
// и страница обязана выглядеть одинаково для него самого и для гостя.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { Avatar } from '@/app/components/Avatar';
import {
  CardDiv,
  CategoryMini,
  Chip,
  CommentIcon,
  EmptyState,
  StarIcon,
} from '@/app/components/ui';
import { getPublicUserAnalyses } from '@/lib/history';
import { getSocialByAnalysis, getUserActivityCounts } from '@/lib/social';
import { getPublicUser, isUuid } from '@/lib/users';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const user = await getPublicUser(id);
  if (!user) notFound();

  const [analyses, counts, session] = await Promise.all([
    getPublicUserAnalyses(id),
    getUserActivityCounts(id),
    auth(),
  ]);
  const social = await getSocialByAnalysis(analyses.map((a) => a.id));
  const isMe = (session?.user as { id?: string } | undefined)?.id === id;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-14">
      <header className="rise flex flex-wrap items-start gap-6">
        <Avatar user={user} size={96} />
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            {user.displayName}
          </h1>
          {/* ФИО под ником показываем только если ник задан — иначе это была
              бы та же строка дважды. */}
          {user.nickname && user.name && (
            <p className="mt-1 text-sm text-[color:var(--muted)]">{user.name}</p>
          )}
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            С нами с {formatDate(user.createdAt)}
          </p>
          {isMe && (
            <Link
              href="/profile"
              className="mt-4 inline-block rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
            >
              Настроить профиль
            </Link>
          )}
        </div>
      </header>

      {user.bio && (
        <CardDiv tone="outline" className="rise mt-8">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[color:var(--ink-2)]">
            {user.bio}
          </p>
        </CardDiv>
      )}

      {user.contacts.length > 0 && (
        <section className="rise mt-6">
          <h2 className="text-xs uppercase tracking-widest text-[color:var(--muted)]">Контакты</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {user.contacts.map((contact) => (
              <li key={contact}>
                <ContactChip value={contact} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rise mt-8 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--line)] sm:grid-cols-3">
        <StatCell label="Репозиториев в рейтинге" value={String(analyses.length)} />
        <StatCell label="Оценок поставлено" value={String(counts.ratings)} />
        <StatCell label="Комментариев" value={String(counts.comments)} />
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Отправлено на анализ</h2>
        {analyses.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="Публичных оценок пока нет"
            hint="Здесь появятся репозитории, которые пользователь опубликовал в рейтинге."
          />
        ) : (
          <ol className="mt-6 grid gap-3">
            {analyses.map((item, idx) => {
              const stats = social.get(item.id);
              return (
                <li
                  key={item.id}
                  className="rise"
                  style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}
                >
                  <Link
                    href={`/a/${item.id}`}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-4 transition hover:border-[color:var(--line-2)] hover:shadow-[var(--shadow-1)] sm:p-5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium tracking-tight group-hover:underline">
                        <span className="text-[color:var(--muted)]">{item.org}/</span>
                        {item.repo}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[color:var(--muted)]">
                        {item.kind === 'material' && <Chip tone="outline">Полезный материал</Chip>}
                        {item.language && <span>{item.language}</span>}
                        {item.finishedAt && <span>{formatDate(item.finishedAt)}</span>}
                        {stats && stats.ratingCount > 0 && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <StarIcon /> {stats.ratingAverage?.toFixed(1)} ({stats.ratingCount})
                          </span>
                        )}
                        {stats && stats.commentCount > 0 && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <CommentIcon /> {stats.commentCount}
                          </span>
                        )}
                      </div>
                      {item.kind !== 'material' && (
                        <CategoryMini values={item.categories} className="mt-3" />
                      )}
                    </div>
                    <div className="text-right">
                      {item.kind === 'material' ? (
                        <div className="max-w-[5.5rem] text-[11px] font-semibold leading-tight text-[color:var(--ink-2)]">
                          Полезный материал
                        </div>
                      ) : (
                        <div className="text-2xl font-semibold leading-none tabular-nums">
                          {item.score ?? '—'}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}

/**
 * Контакт: почта и адрес становятся ссылкой, остальное — просто текстом.
 * Угадывать «телеграм ли это» не берёмся — напишут как напишут.
 */
function ContactChip({ value }: { value: string }) {
  const href = contactHref(value);
  const className =
    'inline-block rounded-full border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel)]';
  if (!href) return <span className={className}>{value}</span>;
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer noopener nofollow">
      {value}
    </a>
  );
}

function contactHref(value: string): string | null {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (/^https?:\/\/\S+$/i.test(value)) return value;
  return null;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--paper-2)] px-5 py-4">
      <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
