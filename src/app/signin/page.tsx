import Link from 'next/link';
import { Suspense } from 'react';
import { SignInForm } from '@/app/components/SignInForm';
import { Chip } from '@/app/components/ui';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-16">
      <div>
        <Chip tone="outline">вход</Chip>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">С возвращением</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Анализ занимает время и ресурсы, поэтому мы просим представиться.
        </p>
      </div>
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-6 shadow-[var(--shadow-1)]">
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
      <p className="text-sm text-[color:var(--muted)]">
        Нет аккаунта?{' '}
        <Link className="text-[color:var(--ink)] underline underline-offset-4" href="/signup">
          Зарегистрируйтесь
        </Link>
        .
      </p>
    </main>
  );
}
