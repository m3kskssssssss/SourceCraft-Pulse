// Верхняя навигация. Sticky, тонкая нижняя граница, справа состояние сессии.
//
// На телефоне ссылки уезжают во вторую строку, а не прячутся: раньше нав-блок
// был `hidden sm:flex`, и с телефона до «Оценить» и «Мои оценки» было просто
// не добраться — оставался только логотип. Бургер здесь не нужен: три ссылки
// помещаются в строку, а лишний клик до главного действия не нужен никому.

import Link from 'next/link';
import { auth } from '@/auth';
import { signOutAction } from '@/app/actions/auth';
import { getPublicUser } from '@/lib/users';
import { Avatar } from './Avatar';
import { Button } from './ui';
import { Planet } from './Planet';

export async function UserBar() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string; email?: string; name?: string } | undefined;

  // Имя и фото берём из базы, а не из сессии: сессия — это JWT, выданный при
  // входе, и после смены ника в шапке ещё неделю висело бы старое.
  const profile = sessionUser?.id ? await getPublicUser(sessionUser.id) : null;

  const links = [
    { href: '/', label: 'Рейтинг' },
    { href: '/analyze', label: 'Оценить' },
    ...(sessionUser ? [{ href: '/my', label: 'Мои оценки' }] : []),
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

        <div className="flex items-center gap-2">
          {sessionUser ? (
            <>
              {/* Имя с фото ведут в профиль: там и настройки, и список того,
                  что человек отправлял на оценку. */}
              <Link
                href="/profile"
                className="inline-flex max-w-[190px] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm text-[color:var(--muted)] transition hover:bg-[color:var(--panel)] hover:text-[color:var(--ink)]"
              >
                <Avatar user={profile} size={26} />
                <span className="hidden truncate sm:inline">
                  {profile?.displayName ?? sessionUser.email}
                </span>
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

      {/* Вторая строка — только для телефона. */}
      <nav className="mx-auto -mt-0.5 flex w-full max-w-6xl items-center gap-1 px-4 pb-2 text-sm sm:hidden">
        {links.map((link) => (
          <NavLink key={link.href} href={link.href}>
            {link.label}
          </NavLink>
        ))}
      </nav>
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
