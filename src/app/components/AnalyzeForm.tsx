'use client';

// Форма запуска анализа. Работает и для гостей, и для авторизованных.
// Гостю сервер-акшн вернёт редирект на /signin?returnTo=/analyze?target=…,
// поэтому здесь достаточно тонкой обёртки над useActionState.

import { useActionState } from 'react';
import { analyzeAction, type AnalyzeState } from '@/app/actions/analyze';

const initial: AnalyzeState = { ok: false };

export function AnalyzeForm({ defaultValue }: { defaultValue?: string }) {
  const [state, formAction, pending] = useActionState(analyzeAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-700">Адрес репозитория</span>
        <input
          type="text"
          name="target"
          required
          defaultValue={defaultValue}
          placeholder="org/repo или https://sourcecraft.tech/org/repo"
          className="rounded-full bg-neutral-100 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
      >
        {pending ? 'Ставим в очередь…' : 'Оценить'}
      </button>
      {state.error && <p className="text-sm text-neutral-700">{state.error}</p>}
    </form>
  );
}
