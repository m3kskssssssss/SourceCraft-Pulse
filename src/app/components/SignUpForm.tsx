'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signUpAction, type SignUpState } from '@/app/actions/auth';

const initial: SignUpState = { ok: false };

export function SignUpForm() {
  const params = useSearchParams();
  const returnTo = params.get('returnTo') ?? '/';
  const [state, formAction, pending] = useActionState(signUpAction, initial);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <input type="hidden" name="returnTo" value={returnTo} />
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
        <span className="text-neutral-700">Пароль (от 8 символов)</span>
        <input
          type="password"
          name="password"
          minLength={8}
          required
          className="rounded-full bg-neutral-100 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-700">Имя (необязательно)</span>
        <input
          type="text"
          name="name"
          maxLength={120}
          className="rounded-full bg-neutral-100 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Регистрируем…' : 'Создать аккаунт'}
      </button>
      {state.error && <p className="text-sm text-neutral-700">{state.error}</p>}
    </form>
  );
}
