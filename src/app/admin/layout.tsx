// Layout админки. Прикручиваем сайдбар и проверку сессии.
// Middleware уже редиректит гостя, но requireAdmin() в actions делает
// повторную серверную проверку — можно и здесь просто дать сайдбар.

import Link from 'next/link';
import { headers } from 'next/headers';
import { adminSignOutAction } from '@/app/actions/admin';

const NAV = [
  { href: '/admin', label: 'Сводка' },
  { href: '/admin/ai', label: 'ИИ и расходы' },
  { href: '/admin/queue', label: 'Очередь' },
  { href: '/admin/users', label: 'Пользователи' },
  { href: '/admin/repositories', label: 'Репозитории' },
  { href: '/admin/settings', label: 'Настройки' },
];

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Не рисуем сайдбар на странице логина.
  const h = await headers();
  const pathname = h.get('x-invoke-path') ?? h.get('x-matched-path') ?? '';
  const onLogin = pathname === '/admin/login';

  if (onLogin) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-full max-w-6xl gap-8 px-6 py-10">
      <aside className="hidden w-56 shrink-0 border-r border-neutral-200 pr-6 md:block">
        <p className="text-xs uppercase tracking-widest text-neutral-500">Админка</p>
        <nav className="mt-4 flex flex-col gap-2 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-neutral-700 hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={adminSignOutAction} className="mt-6">
          <button
            type="submit"
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
          >
            Выйти
          </button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
