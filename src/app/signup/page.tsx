import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth, yandexEnabled } from '@/auth';
import { SignUpForm } from '@/app/components/SignUpForm';
import { OrDivider, YandexButton } from '@/app/components/YandexButton';
import { getPublicUser } from '@/lib/users';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (userId && (await getPublicUser(userId))) redirect('/');

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
      <div className="rise">
        <h1 className="text-3xl font-semibold tracking-tight">Регистрация</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          {yandexEnabled
            ? 'Быстрее всего — через Яндекс ID: имя и фото подтянутся сами. Или по почте и паролю.'
            : 'Храним только email, имя (по желанию) и хеш пароля.'}
        </p>
      </div>
      <div
        className="rise flex flex-col gap-5 rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-6 shadow-[var(--shadow-1)]"
        style={{ animationDelay: '60ms' }}
      >
        {yandexEnabled && (
          <>
            <YandexButton label="Продолжить с Яндекс ID" />
            <OrDivider />
          </>
        )}
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>
      </div>
      <p className="text-sm text-[color:var(--muted)]">
        Уже есть аккаунт?{' '}
        <Link className="text-[color:var(--ink)] underline underline-offset-4" href="/signin">
          Войти
        </Link>
        .
      </p>
    </main>
  );
}
