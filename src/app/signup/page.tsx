import Link from 'next/link';
import { Suspense } from 'react';
import { SignUpForm } from '@/app/components/SignUpForm';
import { Chip } from '@/app/components/ui';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-16">
      <div>
        <Chip tone="outline">регистрация</Chip>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Присоединяйтесь</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Мы сохраняем только email, имя (по желанию) и хеш пароля.
        </p>
      </div>
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-6 shadow-[var(--shadow-1)]">
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
