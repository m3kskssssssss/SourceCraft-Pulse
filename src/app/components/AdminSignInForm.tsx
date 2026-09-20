'use client';

import { useActionState } from 'react';
import { adminSignInAction, type AdminSignInState } from '@/app/actions/admin';
import { Button, Field, Input } from './ui';

const initial: AdminSignInState = { ok: false };

export function AdminSignInForm() {
  const [state, formAction, pending] = useActionState(adminSignInAction, initial);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <Field label="Логин">
        <Input type="text" name="login" required autoComplete="username" />
      </Field>
      <Field label="Пароль">
        <Input type="password" name="password" required autoComplete="current-password" />
      </Field>
      <Button type="submit" disabled={pending} size="lg" className="mt-1">
        {pending ? 'Проверяем…' : 'Войти'}
      </Button>
      {state.error && (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          {state.error}
        </p>
      )}
    </form>
  );
}
