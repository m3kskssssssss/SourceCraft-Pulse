'use client';

// Клиентская форма входа. Отправляет прямо на /api/auth/callback/credentials,
// потому что Auth.js v5 сам умеет обработать credentials-callback POST.
// После успешного логина cookie ставится сервером, а мы редиректим руками.

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get('returnTo') ?? '/';
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
        setError(null);
        startTransition(async () => {
          const res = await signIn('credentials', {
            email,
            password,
            redirect: false,
          });
          if (!res || res.error) {
            setError('Не удалось войти. Проверьте email и пароль.');
            return;
          }
          router.push(safeReturnTo(returnTo));
          router.refresh();
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-700">Email</span>
        <input
          type="email"
          name="email"
          required
          className="rounded-full bg-neutral-100 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-700">Пароль</span>
        <input
          type="password"
          name="password"
          minLength={8}
          required
          className="rounded-full bg-neutral-100 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Входим…' : 'Войти'}
      </button>
      {error && <p className="text-sm text-neutral-700">{error}</p>}
    </form>
  );
}

function safeReturnTo(input: string): string {
  if (!input.startsWith('/') || input.startsWith('//')) return '/';
  return input;
}
