'use client';

// Клиентская обёртка админки: рисует сайдбар с подсветкой активного пункта,
// на узком экране — ленту пунктов над содержимым.
// На /admin/login отдаёт children без сайдбара — так проще, чем возиться с
// headers() на сервере.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from './ui';

const NAV = [
  { href: '/admin', label: 'Сводка', match: (p: string) => p === '/admin' },
  { href: '/admin/ai', label: 'ИИ и расходы', match: (p: string) => p.startsWith('/admin/ai') },
  { href: '/admin/queue', label: 'Очередь', match: (p: string) => p.startsWith('/admin/queue') },
  {
    href: '/admin/catalog',
    label: 'Каталог',
    match: (p: string) => p.startsWith('/admin/catalog'),
  },
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
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 md:flex-row md:gap-8 md:py-10">
      {/* Телефон и планшет: пункты лентой с прокруткой вбок, «Выйти» рядом с
          заголовком. Сайдбар на узком экране не помещается, а без него в
          разделы было не попасть. */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--muted)]">Админка</div>
          <div className="w-24 shrink-0">{signOut}</div>
        </div>
        <nav className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none]">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 transition',
                  active
                    ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
                    : 'border border-[color:var(--line)] text-[color:var(--ink-2)] active:bg-[color:var(--panel)]',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

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
