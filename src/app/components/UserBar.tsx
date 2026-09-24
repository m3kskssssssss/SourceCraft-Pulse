// Верхняя навигация. Sticky, тонкая нижняя граница, справа состояние сессии.
//
// Два вида. На экране — ссылки в строку и имя с фото справа. На телефоне всё
// это уходит под одну кнопку справа: раньше ссылки жили во второй строке, и
// шапка занимала два этажа ради двух пунктов, а вход с выходом всё равно
// теснились рядом с логотипом.

import Link from 'next/link';
import { auth } from '@/auth';
import { signOutAction } from '@/app/actions/auth';
import { getPublicUser } from '@/lib/users';
import { Avatar } from './Avatar';
import { MobileMenu } from './MobileMenu';
import { Button } from './ui';
import { Planet } from './Planet';

export async function UserBar() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string; email?: string; name?: string } | undefined;

  // Имя и фото берём из базы, а не из сессии: сессия — это JWT, выданный при
  // входе, и после смены ника в шапке ещё неделю висело бы старое.
  const profile = sessionUser?.id ? await getPublicUser(sessionUser.id) : null;

  // Отдельной вкладки со своими оценками нет: они живут на стене профиля,
  // куда ведёт имя справа.
  const links = [
    { href: '/', label: 'Рейтинг' },
    { href: '/analyze', label: 'Оценить' },
    { href: '/learn', label: 'Статьи' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-[color:var(--paper)]/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <Planet size={30} />
          <span className="text-base font-semibold tracking-tight transition group-hover:tracking-normal">
            Pulse
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Телефон: одна кнопка, за ней и ссылки, и вход с выходом. */}
        <MobileMenu links={links} user={profile} />

        <div className="hidden items-center gap-2 sm:flex">
          {sessionUser ? (
            <>
              {/* Имя с фото ведут на свою страницу: там и стена с прогонами,
                  и кнопка в настройки. */}
              <Link
                href={profile ? `/u/${profile.id}` : '/profile'}
                className="inline-flex max-w-[190px] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm text-[color:var(--muted)] transition hover:bg-[color:var(--panel)] hover:text-[color:var(--ink)]"
              >
                <Avatar user={profile} size={26} />
                <span className="truncate">{profile?.displayName ?? sessionUser.email}</span>
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Выйти
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-full px-3 py-1.5 text-sm text-[color:var(--ink-2)] hover:bg-[color:var(--panel)]"
              >
                Войти
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[color:var(--ink)] px-3.5 py-1.5 text-sm font-medium text-[color:var(--paper)] hover:bg-[color:var(--ink-2)]"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel)]"
    >
      {children}
    </Link>
  );
}
