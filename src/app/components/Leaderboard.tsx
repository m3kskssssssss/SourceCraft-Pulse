// Куски рейтинга, общие для главной и страницы /rating: подиум из трёх
// карточек и строки списка. Фильтры и сводка живут только на /rating.

import Link from 'next/link';
import type { LeaderboardItem } from '@/lib/ranking';
import { CategoryMini, CommentIcon, StarIcon } from './ui';

export function Podium({ items }: { items: LeaderboardItem[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {items.map((item, idx) => (
        // Карточка — не ссылка, а контейнер: внутри живёт своя ссылка на
        // обсуждение, а <a> внутри <a> не бывает. Клик по карточке ловит
        // растянутая ссылка под содержимым.
        <div
          key={item.id}
          // @container: шкалы категорий внутри перестраиваются по ширине самой
          // карточки, а не окна — в три колонки она узкая даже на большом экране.
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
              // На тесной карточке кегль меньше: в три колонки «Полезный
              // материал» в 24 пикселя не помещается.
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
            <span className="min-w-0 truncate">{item.language ?? 'Язык не определён'}</span>
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
  );
}

export function LeaderboardRows({ items, startPlace }: { items: LeaderboardItem[]; startPlace: number }) {
  return (
    <ol className="mt-8 divide-y divide-[color:var(--line)]">
      {items.map((item, idx) => {
        const place = startPlace + idx;
        const isMaterial = item.kind === 'material';
        return (
          <li key={item.id} className="rise" style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}>
            {/* На телефоне колонки номера нет: она сдвигала весь список вправо
                относительно заголовка. Номер уходит в строку названия, а с sm
                возвращается своей колонкой. Сама строка — не ссылка: внутри
                есть ссылка к обсуждению. Клик по строке ловит растянутая ссылка. */}
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
                  <span className="tabular-nums text-[color:var(--muted-2)] sm:hidden">{place}. </span>
                  <span className="text-[color:var(--muted)]">{item.org}/</span>
                  <span className="group-hover:underline">{item.repo}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[color:var(--muted)]">
                  {/* На телефоне пометка живёт здесь, на экране — крупно справа,
                      на месте балла. Дублировать незачем. */}
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
                // Тем же кеглем, что балл у проектов, и только с sm: на телефоне
                // пометка уже стоит под названием.
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

function ForkIcon() {
  return (
    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
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
