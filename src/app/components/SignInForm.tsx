'use client';

// Клиентская форма входа. Отправляет прямо на /api/auth/callback/credentials,
// потому что Auth.js v5 сам умеет обработать credentials-callback POST.
// После успешного логина cookie ставится сервером, а мы редиректим руками.

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button, Field, Input } from './ui';

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  // После входа логично оказаться на «Оценить»: вход нужен ровно для этого.
  const returnTo = params.get('returnTo') ?? '/analyze';
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex w-full flex-col gap-4"
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
      <Field label="Email">
        <Input type="email" name="email" required autoComplete="email" />
      </Field>
      <Field label="Пароль">
        <Input type="password" name="password" minLength={8} required autoComplete="current-password" />
      </Field>
      <Button type="submit" disabled={pending} size="lg" className="mt-1">
        {pending ? 'Входим…' : 'Войти'}
      </Button>
      {error && (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          {error}
        </p>
      )}
    </form>
  );
}

function safeReturnTo(input: string): string {
  if (!input.startsWith('/') || input.startsWith('//')) return '/';
  return input;
}
