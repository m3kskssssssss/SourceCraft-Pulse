'use client';

// Клиентская обёртка админки: рисует сайдбар с подсветкой активного пункта.
// На /admin/login отдаёт children без сайдбара — так проще, чем возиться с
// headers() на сервере.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from './ui';

const NAV = [
  { href: '/admin', label: 'Сводка', match: (p: string) => p === '/admin' },
  { href: '/admin/ai', label: 'ИИ и расходы', match: (p: string) => p.startsWith('/admin/ai') },
  { href: '/admin/queue', label: 'Очередь', match: (p: string) => p.startsWith('/admin/queue') },
  { href: '/admin/users', label: 'Пользователи', match: (p: string) => p.startsWith('/admin/users') },
  {
    href: '/admin/social',
    label: 'Обсуждение',
    match: (p: string) => p.startsWith('/admin/social'),
  },
  {
    href: '/admin/repositories',
    label: 'Репозитории',
    match: (p: string) => p.startsWith('/admin/repositories'),
  },
  {
    href: '/admin/settings',
    label: 'Настройки',
    match: (p: string) => p.startsWith('/admin/settings'),
  },
];

export function AdminShell({
  children,
  signOut,
}: {
  children: React.ReactNode;
  signOut: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl gap-8 px-6 py-10">
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="sticky top-24 rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-4">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
            Админка
          </div>
          <nav className="mt-1 flex flex-col gap-1 text-sm">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    'rounded-2xl px-3 py-2 transition',
                    active
                      ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
                      : 'text-[color:var(--ink-2)] hover:bg-[color:var(--panel)]',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-[color:var(--line)] pt-4">{signOut}</div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
