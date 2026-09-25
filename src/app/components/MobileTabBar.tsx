'use client';

// Нижняя панель вкладок на телефоне — как в Instagram и Telegram на iOS.
//
// Плавающая «стеклянная» капсула (.glass в globals.css) над нижним краем:
// четыре вкладки и круглая кнопка «Оценить» по центру. На экране от md и
// выше её нет — там вкладки в шапке. В админке тоже нет: у неё своё меню.
//
// Отступ снизу учитывает безопасную зону iPhone (.tabbar), поэтому панель не
// спорит ни с полоской «домой», ни с нижней панелью Safari.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PublicUser } from '@/lib/user-display';
import { Avatar } from './Avatar';
import { isActivePath } from './HeaderNav';
import { cx } from './ui';

type Tab = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  active?: (pathname: string) => boolean;
};

export function MobileTabBar({ user }: { user: PublicUser | null }) {
  const pathname = usePathname();
  const typing = useTyping();
  if (pathname.startsWith('/admin') || typing) return null;

  const left: Tab[] = [
    { href: '/', label: 'Главная', icon: (a) => <HomeIcon active={a} /> },
    { href: '/rating', label: 'Рейтинг', icon: (a) => <RatingIcon active={a} /> },
  ];
  const right: Tab[] = [
    user
      ? { href: '/repos', label: 'Мои', icon: (a) => <ReposIcon active={a} /> }
      : { href: '/learn', label: 'Статьи', icon: (a) => <BookIcon active={a} /> },
    user
      ? {
          href: `/u/${user.id}`,
          label: 'Профиль',
          icon: (a) => (
            <span
              className={cx(
                'rounded-full ring-2 transition',
                a ? 'ring-[color:var(--ink)]' : 'ring-transparent',
              )}
            >
              <Avatar user={user} size={24} />
            </span>
          ),
          active: (p) => p === `/u/${user.id}` || p.startsWith('/profile'),
        }
      : { href: '/signin', label: 'Войти', icon: (a) => <PersonIcon active={a} /> },
  ];

  const renderTab = (tab: Tab) => {
    const active = tab.active ? tab.active(pathname) : isActivePath(pathname, tab.href);
    return (
      <Link
        key={tab.href}
        href={tab.href}
        aria-current={active ? 'page' : undefined}
        className={cx(
          'tap relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition active:scale-95',
          active ? 'text-[color:var(--ink)]' : 'text-[color:var(--muted)]',
        )}
      >
        {/* Подложка активной вкладки — как у таб-бара iOS. */}
        <span
          aria-hidden
          className={cx(
            'absolute inset-x-1 inset-y-0.5 rounded-full bg-[color:var(--ink)] transition-opacity duration-200',
            active ? 'opacity-[0.07]' : 'opacity-0',
          )}
        />
        <span className="relative flex h-6 items-center">{tab.icon(active)}</span>
        <span className={cx('relative text-[10px] leading-none', active && 'font-semibold')}>
          {tab.label}
        </span>
      </Link>
    );
  };

  const evaluateActive = isActivePath(pathname, '/analyze');

  return (
    <nav
      aria-label="Разделы"
      className="tabbar glass fixed inset-x-3 z-40 mx-auto flex max-w-md items-center gap-1 rounded-[28px] px-1.5 py-1.5 md:hidden"
    >
      {left.map(renderTab)}
      <Link
        href="/analyze"
        aria-label="Оценить репозиторий"
        aria-current={evaluateActive ? 'page' : undefined}
        className="tap mx-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--ink)] text-[color:var(--paper)] shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition active:scale-90"
      >
        <PlusIcon />
      </Link>
      {right.map(renderTab)}
    </nav>
  );
}

/**
 * Фокус в поле ввода — значит, на телефоне открыта клавиатура. Панель с
 * position: fixed на iOS в этот момент всплывает над клавиатурой и закрывает
 * поле, поэтому на время ввода её прячем, как это делают системные таб-бары.
 */
function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null): boolean =>
      el instanceof HTMLElement &&
      (el.isContentEditable ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        (el.tagName === 'INPUT' &&
          !['checkbox', 'radio', 'button', 'submit', 'range', 'file'].includes(
            (el as HTMLInputElement).type,
          )));
    const onIn = (e: FocusEvent): void => setTyping(isField(e.target));
    // Фокус уходит из поля в никуда — клавиатура закрылась.
    const onOut = (e: FocusEvent): void => {
      if (!isField(e.relatedTarget)) setTyping(false);
    };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  return typing;
}

// ---------- Иконки: контур в покое, заливка у активной — как в iOS ----------

function Icon({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={active ? 1.4 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <Icon active={active}>
      <path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19Z" />
    </Icon>
  );
}

function RatingIcon({ active }: { active: boolean }) {
  return (
    <Icon active={active}>
      <rect x="3.5" y="12" width="4.5" height="8.5" rx="1.2" />
      <rect x="9.75" y="4" width="4.5" height="16.5" rx="1.2" />
      <rect x="16" y="8.5" width="4.5" height="12" rx="1.2" />
    </Icon>
  );
}

function ReposIcon({ active }: { active: boolean }) {
  return (
    <Icon active={active}>
      <path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h3.6l2 2.2H18A2.5 2.5 0 0 1 20.5 9.2V17A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17Z" />
    </Icon>
  );
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <Icon active={active}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" />
    </Icon>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <Icon active={active}>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0Z" />
    </Icon>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
