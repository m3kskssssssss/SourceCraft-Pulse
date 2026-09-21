// Верхняя навигация. Sticky, тонкая нижняя граница, справа состояние сессии.

import Link from 'next/link';
import { auth } from '@/auth';
import { signOutAction } from '@/app/actions/auth';
import { Button } from './ui';
import { Penguin } from './Penguin';

export async function UserBar() {
  const session = await auth();
  const user = session?.user as { email?: string; name?: string } | undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-[color:var(--paper)]/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <Penguin size={30} />
          <span className="text-base font-semibold tracking-tight transition group-hover:tracking-normal">
            Pulse
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm sm:flex">
          <NavLink href="/">Рейтинг</NavLink>
          <NavLink href="/analyze">Оценить</NavLink>
          {user && <NavLink href="/my">Мои оценки</NavLink>}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Имя ведёт в личную историю — иначе оно просто висит в шапке. */}
              <Link
                href="/my"
                className="hidden max-w-[180px] truncate rounded-full px-3 py-1.5 text-sm text-[color:var(--muted)] transition hover:bg-[color:var(--panel)] hover:text-[color:var(--ink)] sm:inline-block"
              >
                {user.name ?? user.email}
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
