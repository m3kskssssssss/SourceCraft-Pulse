'use client';

// Меню шапки на телефоне: одна кнопка справа вместо россыпи ссылок.
//
// Раньше ссылки уезжали во вторую строку, и шапка занимала два этажа ради
// двух пунктов. Теперь всё, включая вход и выход, живёт под кнопкой справа.
//
// Клиентский компонент, а не <details>: меню должно закрываться при переходе
// и по клику мимо, а разметка App Router между переходами сохраняется —
// открытый <details> так и остался бы открытым на новой странице.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';
import type { PublicUser } from '@/lib/user-display';
import { Avatar } from './Avatar';
import { isActivePath } from './HeaderNav';
import { cx } from './ui';

export type MenuLink = { href: string; label: string };

export function MobileMenu({
  links,
  user,
}: {
  links: MenuLink[];
  user: PublicUser | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  // Переход по ссылке меню не перерисовывает шапку — закрываем сами.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Меню"
        className={cx(
          'flex items-center gap-1.5 rounded-full border border-[color:var(--line)] py-1 pl-1 pr-2 transition',
          open ? 'bg-[color:var(--panel)]' : 'hover:bg-[color:var(--panel)]',
        )}
      >
        {user ? <Avatar user={user} size={26} /> : <BurgerIcon />}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] p-1.5 shadow-[var(--shadow-2)]"
        >
          {user && (
            <div className="border-b border-[color:var(--line)] px-3 pb-2.5 pt-2">
              <div className="truncate text-sm font-medium">{user.displayName}</div>
              <Link
                href={`/u/${user.id}`}
                onClick={() => setOpen(false)}
                className="text-xs text-[color:var(--muted)] underline-offset-4 hover:underline"
              >
                Моя страница
              </Link>
            </div>
          )}

          <nav className="grid py-1">
            {links.map((link) => (
              <MenuItem
                key={link.href}
                href={link.href}
                active={isActivePath(pathname, link.href)}
                onNavigate={() => setOpen(false)}
              >
                {link.label}
              </MenuItem>
            ))}
          </nav>

          <div className="border-t border-[color:var(--line)] pt-1">
            {user ? (
              <>
                <MenuItem href="/profile" onNavigate={() => setOpen(false)}>
                  Настройки профиля
                </MenuItem>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel)]"
                  >
                    Выйти
                  </button>
                </form>
              </>
            ) : (
              <>
                <MenuItem href="/signin" onNavigate={() => setOpen(false)}>
                  Войти
                </MenuItem>
                <MenuItem href="/signup" onNavigate={() => setOpen(false)}>
                  Регистрация
                </MenuItem>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  children,
  onNavigate,
  active = false,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'rounded-xl px-3 py-2.5 text-sm transition hover:bg-[color:var(--panel)]',
        active ? 'bg-[color:var(--panel)] font-medium text-[color:var(--ink)]' : 'text-[color:var(--ink-2)]',
      )}
    >
      {children}
    </Link>
  );
}

function BurgerIcon() {
  return (
    <span className="flex h-[26px] w-[26px] items-center justify-center" aria-hidden>
      <svg viewBox="0 0 16 16" width="15" height="15" stroke="currentColor" strokeWidth="1.6">
        <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width="9"
      height="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
      className={cx('transition-transform duration-200', open && 'rotate-180')}
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
