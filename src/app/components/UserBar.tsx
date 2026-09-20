// Верхняя панель: слева — ссылка на главную, справа — состояние сессии.

import Link from 'next/link';
import { auth } from '@/auth';
import { signOutAction } from '@/app/actions/auth';

export async function UserBar() {
  const session = await auth();
  const user = session?.user as { email?: string; name?: string } | undefined;

  return (
    <div className="flex w-full items-center justify-between border-b border-neutral-200 px-6 py-4 text-sm">
      <Link href="/" className="font-semibold tracking-tight">
        Pulse
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-neutral-600">{user.name ?? user.email}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-full border border-neutral-300 px-3 py-1 text-neutral-700 hover:bg-neutral-100"
              >
                Выйти
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/signin" className="text-neutral-700 hover:underline">
              Войти
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-neutral-900 px-3 py-1 text-white hover:opacity-90"
            >
              Регистрация
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
