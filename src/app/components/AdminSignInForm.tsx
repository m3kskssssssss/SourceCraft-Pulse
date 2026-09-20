'use client';

import { useActionState } from 'react';
import { adminSignInAction, type AdminSignInState } from '@/app/actions/admin';

const initial: AdminSignInState = { ok: false };

export function AdminSignInForm() {
  const [state, formAction, pending] = useActionState(adminSignInAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-700">Логин</span>
        <input
          type="text"
          name="login"
          required
          autoComplete="username"
          className="rounded-full bg-neutral-100 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-700">Пароль</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded-full bg-neutral-100 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Проверяем…' : 'Войти'}
      </button>
      {state.error && <p className="text-sm text-neutral-700">{state.error}</p>}
    </form>
  );
}
