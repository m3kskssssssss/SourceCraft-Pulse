// Страница пользователя: кто это, как с ним связаться и что он отправлял
// на оценку.
//
// Хозяину страницы видно больше: все его прогоны, включая приватные и
// незавершённые, и переключатель публикации у каждого. Отдельной вкладки
// «Мои оценки» больше нет — стена профиля и есть это место.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { toggleVisibilityAction } from '@/app/actions/visibility';
import { Avatar } from '@/app/components/Avatar';
import {
  CardDiv,
  CategoryMini,
  Chip,
  CommentIcon,
  ContactBadge,
  EmptyState,
  StarIcon,
} from '@/app/components/ui';
import {
  CONTACT_META,
  contactHref,
  contactLabel,
  type ContactLink,
} from '@/lib/contacts';
import { getPublicUserAnalyses, getUserAnalyses, type HistoryItem } from '@/lib/history';
import { getSocialByAnalysis, getUserActivityCounts, type AnalysisSocial } from '@/lib/social';
import { getPublicUser, isUuid } from '@/lib/users';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

const STATUS_LABELS: Record<HistoryItem['status'], string> = {
  queued: 'В очереди',
  running: 'Считается',
  done: 'Готово',
  failed: 'Ошибка',
};

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [user, session] = await Promise.all([getPublicUser(id), auth()]);
  if (!user) notFound();

  const isMe = (session?.user as { id?: string } | undefined)?.id === id;

  const [analyses, counts] = await Promise.all([
    // Свои прогоны видны все, чужие — только опубликованные.
    isMe ? getUserAnalyses(id) : getPublicUserAnalyses(id),
    getUserActivityCounts(id),
  ]);
  const social = await getSocialByAnalysis(analyses.map((a) => a.id));

  const doneCount = analyses.filter((a) => a.status === 'done').length;
  const publishedCount = analyses.filter((a) => a.isPublic).length;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-14">
      {/* Ник — одно слово любой длины: на телефоне он переносится по
          символам и не раздвигает страницу вбок. */}
      <header className="rise flex items-start gap-4 sm:gap-6">
        <span className="shrink-0 sm:hidden">
          <Avatar user={user} size={64} />
        </span>
        <span className="hidden shrink-0 sm:block">
          <Avatar user={user} size={96} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
            {user.displayName}
          </h1>
          {/* ФИО под ником показываем только если ник задан — иначе это была
              бы та же строка дважды. */}
          {user.nickname && user.name && (
            <p className="mt-1 text-sm text-[color:var(--muted)] [overflow-wrap:anywhere]">{user.name}</p>
          )}
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            С нами с {formatDate(user.createdAt)}
          </p>
          {isMe && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/profile"
                className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
              >
                Настройки профиля
              </Link>
              <Link
                href="/analyze"
                className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel)]"
              >
                Оценить репозиторий
              </Link>
            </div>
          )}
        </div>
      </header>

      {user.bio && (
        <CardDiv tone="outline" className="rise mt-8">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[color:var(--ink-2)] [overflow-wrap:anywhere]">
            {user.bio}
          </p>
        </CardDiv>
      )}

      {(user.contacts.length > 0 || user.legacyContacts.length > 0) && (
        <section className="rise mt-6">
          <h2 className="text-xs uppercase tracking-widest text-[color:var(--muted)]">Контакты</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {user.contacts.map((contact) => (
              <li key={contact.kind}>
                <ContactChip contact={contact} />
              </li>
            ))}
            {/* Строки из прежнего свободного поля: значка у них нет, потому
                что неизвестно, что это. Исчезнут при первом сохранении. */}
            {user.legacyContacts.map((line) => (
              <li
                key={line}
                className="inline-block max-w-full rounded-full border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--muted)] [overflow-wrap:anywhere]"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rise mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--line)]">
        {isMe ? (
          <>
            <StatCell label="Всего запусков" value={String(analyses.length)} />
            <StatCell label="Посчитано" value={String(doneCount)} />
            <StatCell label="В рейтинге" value={String(publishedCount)} />
          </>
        ) : (
          <>
            <StatCell label="Репозиториев в рейтинге" value={String(analyses.length)} />
            <StatCell label="Оценок поставлено" value={String(counts.ratings)} />
            <StatCell label="Комментариев" value={String(counts.comments)} />
          </>
        )}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          {isMe ? 'Мои оценки' : 'Отправлено на анализ'}
        </h2>
        {isMe && (
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Приватные прогоны видны только вам. «Показать в рейтинге» публикует этот прогон и
            снимает прежний публичный по тому же репозиторию.
          </p>
        )}

        {analyses.length === 0 ? (
          <EmptyState
            className="mt-6"
            title={isMe ? 'Здесь пока ничего нет' : 'Публичных оценок пока нет'}
            hint={
              isMe
                ? 'Оценённые репозитории появятся здесь вместе с историей прогонов.'
                : 'Здесь появятся репозитории, которые пользователь опубликовал в рейтинге.'
            }
            action={
              isMe ? (
                <Link
                  href="/analyze"
                  className="mt-2 rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
                >
                  Оценить репозиторий
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ol className="mt-6 grid gap-3">
            {analyses.map((item, idx) => (
              <li
                key={item.id}
                className="rise"
                style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}
              >
                <AnalysisCard item={item} stats={social.get(item.id)} showControls={isMe} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

/**
 * Карточка прогона. Не ссылка, а контейнер с растянутой ссылкой под
 * содержимым: у хозяина внутри стоит форма публикации, а кнопку внутри <a>
 * класть нельзя.
 */
function AnalysisCard({
  item,
  stats,
  showControls,
}: {
  item: HistoryItem;
  stats: AnalysisSocial | undefined;
  showControls: boolean;
}) {
  const isMaterial = item.kind === 'material';

  return (
    <div className="group pointer-events-none relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-4 transition hover:border-[color:var(--line-2)] hover:shadow-[var(--shadow-1)] sm:p-5">
      <Link
        href={`/a/${item.id}`}
        aria-label={`${item.org}/${item.repo}`}
        className="pointer-events-auto absolute inset-0 rounded-2xl"
      />

      <div className="min-w-0">
        <div className="truncate text-[15px] font-medium tracking-tight group-hover:underline">
          <span className="text-[color:var(--muted)]">{item.org}/</span>
          {item.repo}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[color:var(--muted)]">
          {showControls && item.status !== 'done' && (
            <Chip tone="outline">{STATUS_LABELS[item.status]}</Chip>
          )}
          {item.isPublic ? (
            <Chip tone="ink">В рейтинге</Chip>
          ) : (
            showControls && item.status === 'done' && <Chip tone="outline">Приватно</Chip>
          )}
          {isMaterial && <Chip tone="outline">Полезный материал</Chip>}
          {item.language && <span>{item.language}</span>}
          <span>{formatDate(item.finishedAt ?? item.createdAt)}</span>
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

        {item.status === 'done' && !isMaterial && (
          <CategoryMini values={item.categories} className="mt-3" />
        )}

        {/* Публикация прямо со стены: ради неё и не нужна отдельная вкладка. */}
        {showControls && item.status === 'done' && (
          <form action={toggleVisibilityAction} className="pointer-events-auto relative mt-3">
            <input type="hidden" name="analysisId" value={item.id} />
            <input type="hidden" name="next" value={item.isPublic ? '0' : '1'} />
            <button
              type="submit"
              className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel)]"
            >
              {item.isPublic ? 'Скрыть из рейтинга' : 'Показать в рейтинге'}
            </button>
          </form>
        )}
      </div>

      <div className="text-right">
        {isMaterial ? (
          <div className="max-w-[5.5rem] text-[11px] font-semibold leading-tight text-[color:var(--ink-2)]">
            Полезный материал
          </div>
        ) : (
          <div className="text-2xl font-semibold leading-none tabular-nums">
            {item.score ?? '—'}
          </div>
        )}
        {item.delta !== null && item.delta !== 0 && (
          <div
            className="mt-1 text-xs tabular-nums"
            style={{
              color: item.delta > 0 ? 'var(--accent-security)' : 'var(--accent-activity)',
            }}
          >
            {item.delta > 0 ? '+' : ''}
            {item.delta} к прошлому
          </div>
        )}
      </div>
    </div>
  );
}

/** Контакт: значок сети плюс кликабельный ник. */
function ContactChip({ contact }: { contact: ContactLink }) {
  const meta = CONTACT_META[contact.kind];
  return (
    <a
      href={contactHref(contact)}
      title={meta.title}
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-[color:var(--line)] py-1.5 pl-1.5 pr-3.5 text-sm text-[color:var(--ink-2)] transition hover:border-[color:var(--line-2)] hover:bg-[color:var(--panel)]"
      target={contact.kind === 'email' ? undefined : '_blank'}
      rel="noreferrer noopener nofollow"
    >
      <ContactBadge text={meta.badge} />
      <span className="min-w-0 truncate">{contactLabel(contact)}</span>
    </a>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col justify-between bg-[color:var(--paper-2)] px-3 py-3 sm:px-5 sm:py-4">
      <div className="text-[10px] uppercase leading-tight tracking-wide text-[color:var(--muted)] sm:text-xs sm:tracking-widest">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
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
