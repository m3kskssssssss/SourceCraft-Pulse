import Link from 'next/link';
import { Suspense } from 'react';
import { SignInForm } from '@/app/components/SignInForm';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Вход</h1>
        <p className="mt-2 text-neutral-600">
          Анализ занимает время и ресурсы, поэтому мы просим представиться.
        </p>
      </div>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
      <p className="text-sm text-neutral-600">
        Нет аккаунта?{' '}
        <Link className="underline underline-offset-2" href="/signup">
          Зарегистрируйтесь
        </Link>
        .
      </p>
    </main>
  );
}
