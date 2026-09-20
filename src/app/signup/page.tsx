import Link from 'next/link';
import { Suspense } from 'react';
import { SignUpForm } from '@/app/components/SignUpForm';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Регистрация</h1>
        <p className="mt-2 text-neutral-600">
          Мы сохраняем только email, имя (по желанию) и хеш пароля.
        </p>
      </div>
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
      <p className="text-sm text-neutral-600">
        Уже есть аккаунт?{' '}
        <Link className="underline underline-offset-2" href="/signin">
          Войти
        </Link>
        .
      </p>
    </main>
  );
}
