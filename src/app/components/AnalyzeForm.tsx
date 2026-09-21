'use client';

// Форма запуска анализа. Работает и для гостей, и для авторизованных.
// Гостю сервер-акшн вернёт редирект на /signin?returnTo=/analyze?target=…,
// поэтому здесь достаточно тонкой обёртки над useActionState.

import { useActionState } from 'react';
import { analyzeAction, type AnalyzeState } from '@/app/actions/analyze';
import { Button, Input } from './ui';

const initial: AnalyzeState = { ok: false };

export function AnalyzeForm({ defaultValue }: { defaultValue?: string }) {
  const [state, formAction, pending] = useActionState(analyzeAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          name="target"
          required
          defaultValue={defaultValue}
          placeholder="org/repo или https://sourcecraft.dev/org/repo"
          className="sm:flex-1"
          aria-label="Адрес репозитория"
        />
        <Button type="submit" disabled={pending} size="lg" className="sm:w-40">
          {pending ? 'Запускаем…' : 'Оценить'}
        </Button>
      </div>
      {state.error && (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          {state.error}
        </p>
      )}
      <p className="text-xs text-[color:var(--muted)]">
        Без входа сначала откроется форма входа, после неё анализ запустится сам.
      </p>
    </form>
  );
}
