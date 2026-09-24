'use client';

// Вкладки шапки на экране. Клиентские только ради подсветки текущей:
// путь знает usePathname, а шапка — серверный компонент.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from './ui';

export type NavItem = { href: string; label: string };

/** Главная активна только на «/», остальные — и на вложенных адресах. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({ links }: { links: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 text-sm sm:flex">
      {links.map((link) => {
        const active = isActivePath(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'rounded-full px-3 py-1.5 transition',
              active
                ? 'bg-[color:var(--panel)] font-medium text-[color:var(--ink)]'
                : 'text-[color:var(--ink-2)] hover:bg-[color:var(--panel)]',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
