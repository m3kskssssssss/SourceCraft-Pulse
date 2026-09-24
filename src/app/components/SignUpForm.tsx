'use client';

import { useActionState } from 'react';
import { signUpAction, type SignUpState } from '@/app/actions/auth';
import { Button, Field, Input } from './ui';

const initial: SignUpState = { ok: false };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initial);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <Field label="Email">
        <Input type="email" name="email" required autoComplete="email" />
      </Field>
      <Field label="Пароль" hint="От 8 символов.">
        <Input type="password" name="password" minLength={8} required autoComplete="new-password" />
      </Field>
      <Field label="Имя" hint="Необязательно — показывается вам в шапке.">
        <Input type="text" name="name" maxLength={120} autoComplete="name" />
      </Field>
      <Button type="submit" disabled={pending} size="lg" className="mt-1">
        {pending ? 'Регистрируем…' : 'Создать аккаунт'}
      </Button>
      {state.error && (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          {state.error}
        </p>
      )}
    </form>
  );
}
