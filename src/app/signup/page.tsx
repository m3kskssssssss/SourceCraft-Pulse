import Link from 'next/link';
import { Suspense } from 'react';
import { SignUpForm } from '@/app/components/SignUpForm';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ returnTo?: string }> };

export default async function SignUpPage({ searchParams }: PageProps) {
  const { returnTo } = await searchParams;
  const signInHref = returnTo ? `/signin?returnTo=${encodeURIComponent(returnTo)}` : '/signin';

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-16">
      <div className="rise">
        <h1 className="text-3xl font-semibold tracking-tight">Регистрация</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Храним только email, имя (по желанию) и хеш пароля. Имя показывается вам же в шапке и
          ведёт в историю ваших оценок.
        </p>
      </div>
      <div
        className="rise rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-6 shadow-[var(--shadow-1)]"
        style={{ animationDelay: '60ms' }}
      >
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>
      </div>
      <p className="text-sm text-[color:var(--muted)]">
        Уже есть аккаунт?{' '}
        <Link className="text-[color:var(--ink)] underline underline-offset-4" href={signInHref}>
          Войти
        </Link>
        .
      </p>
    </main>
  );
}
