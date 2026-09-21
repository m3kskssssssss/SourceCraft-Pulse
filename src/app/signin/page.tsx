import Link from 'next/link';
import { Suspense } from 'react';
import { SignInForm } from '@/app/components/SignInForm';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ returnTo?: string }> };

export default async function SignInPage({ searchParams }: PageProps) {
  const { returnTo } = await searchParams;
  // Куда вернуться, знает только та страница, с которой пришли, — не теряем
  // этот адрес при переходе на регистрацию.
  const signUpHref = returnTo
    ? `/signup?returnTo=${encodeURIComponent(returnTo)}`
    : '/signup';

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-16">
      <div className="rise">
        <h1 className="text-3xl font-semibold tracking-tight">Вход</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Оценка расходует API и модель, поэтому запуск доступен после входа.
        </p>
      </div>
      <div
        className="rise rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-6 shadow-[var(--shadow-1)]"
        style={{ animationDelay: '60ms' }}
      >
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
      <p className="text-sm text-[color:var(--muted)]">
        Нет аккаунта?{' '}
        <Link className="text-[color:var(--ink)] underline underline-offset-4" href={signUpHref}>
          Зарегистрируйтесь
        </Link>
        .
      </p>
    </main>
  );
}
