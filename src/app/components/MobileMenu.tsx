'use client';

// Меню шапки на телефоне: одна кнопка «ещё» справа.
//
// Основная навигация на телефоне — нижняя панель (MobileTabBar), и аватар
// живёт в ней, на вкладке профиля. Шапка его не повторяет: так устроены
// Instagram и Telegram на iOS, так советуют Apple HIG и Material 3 — одна
// точка идентичности, одна основная навигация. Здесь — только второстепенное:
// разделы, которых нет в нижней панели, тема, настройки и выход. Кнопка —
// иконка без подписи, зона нажатия 44×44 (минимум по HIG).
//
// Клиентский компонент, а не <details>: меню должно закрываться при переходе
// и по клику мимо, а разметка App Router между переходами сохраняется —
// открытый <details> так и остался бы открытым на новой странице.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';
import type { PublicUser } from '@/lib/user-display';
import { ThemeToggle } from './ThemeToggle';
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
  // Что уже есть в нижней панели, в меню не дублируем.
  const inTabBar = new Set(['/', '/rating', '/analyze', user ? '/repos' : '/learn']);
  const items = [
    ...links.filter((link) => !inTabBar.has(link.href)),
    { href: '/methodology', label: 'Как считается балл' },
    { href: '/api-docs', label: 'Публичный API' },
  ];

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
        aria-label={open ? 'Закрыть меню' : 'Меню'}
        className={cx(
          'tap -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--ink)] transition active:scale-95',
          open ? 'bg-[color:var(--panel)]' : 'hover:bg-[color:var(--panel)]',
        )}
      >
        <MenuIcon open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] p-1.5 shadow-[var(--shadow-2)]"
        >
          <nav className="grid py-1">
            {items.map((link) => (
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

          <div className="flex items-center justify-between border-t border-[color:var(--line)] px-3 py-2">
            <span className="text-sm text-[color:var(--ink-2)]">Тема</span>
            <ThemeToggle />
          </div>

          <div className="border-t border-[color:var(--line)] pt-1">
            {user ? (
              <>
                <div className="truncate px-3 pb-1 pt-2 text-xs text-[color:var(--muted)]">
                  Вы вошли как {user.displayName}
                </div>
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
                {/* «Войти» есть в нижней панели, здесь — только регистрация. */}
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

/**
 * Три полоски; у открытого меню верхняя и нижняя сходятся в крестик, средняя
 * гаснет. Так кнопка сама говорит, что вторым нажатием меню закроется.
 */
function MenuIcon({ open }: { open: boolean }) {
  const line = 'origin-center transition-transform duration-200 ease-out';
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M4 7h16" className={line} style={{ transform: open ? 'translateY(5px) rotate(45deg)' : undefined, transformBox: 'fill-box' }} />
      <path d="M4 12h16" className="transition-opacity duration-150" style={{ opacity: open ? 0 : 1 }} />
      <path d="M4 17h16" className={line} style={{ transform: open ? 'translateY(-5px) rotate(-45deg)' : undefined, transformBox: 'fill-box' }} />
    </svg>
  );
}
