'use client';

// Форма настроек админки.
//
// Клиентская она ради двух вещей, которых не было: подтверждения «Сохранено»
// и полей, которые после сохранения показывают то, что реально лежит в базе.
// Раньше форма была серверной с `defaultValue`: браузер оставлял в полях
// набранное руками, экшен на негодном значении молча выходил, — и админка
// выглядела так, будто ничего не сохраняет.

import { useActionState, useEffect, useState } from 'react';
import {
  adminUpdateSettingsAction,
  type AdminSettingsState,
} from '@/app/actions/admin-settings';
import type { AdminSettingsValues } from '@/lib/admin-settings';
import { Button, Field, Input } from './ui';

const INITIAL: AdminSettingsState = { status: 'idle' };

type FormValues = Record<keyof AdminSettingsValues, string>;

function toStrings(values: AdminSettingsValues): FormValues {
  return {
    aiModel: values.aiModel,
    monthlyBudgetRub: String(values.monthlyBudgetRub),
    userDaily: String(values.userDaily),
    userConcurrent: String(values.userConcurrent),
  };
}

export function AdminSettingsForm({ values }: { values: AdminSettingsValues }) {
  const [state, formAction, pending] = useActionState(adminUpdateSettingsAction, INITIAL);
  const [form, setForm] = useState<FormValues>(() => toStrings(values));

  // Поля управляемые, поэтому после удачного сохранения их надо переставить
  // руками — на перечитанные из базы значения, а не на отправленные.
  useEffect(() => {
    if (state.status === 'saved') setForm(toStrings(state.values));
  }, [state]);

  const set = (key: keyof FormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setForm((prev) => ({ ...prev, [key]: next }));
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Активная модель (routerai)">
        <Input
          name="aiModel"
          value={form.aiModel}
          onChange={set('aiModel')}
          placeholder="openai/gpt-6-luna-pro"
        />
      </Field>
      <Field
        label="Месячный бюджет ИИ, ₽"
        hint="0 — без лимита. По достижении лимита AI-задачи перестают выполняться."
      >
        <Input
          type="number"
          step="0.01"
          min="0"
          name="monthlyBudgetRub"
          value={form.monthlyBudgetRub}
          onChange={set('monthlyBudgetRub')}
        />
      </Field>
      <Field label="Лимит анализов в сутки на пользователя">
        <Input
          type="number"
          min="1"
          max="1000"
          name="userDaily"
          value={form.userDaily}
          onChange={set('userDaily')}
        />
      </Field>
      <Field label="Одновременно в очереди">
        <Input
          type="number"
          min="1"
          max="20"
          name="userConcurrent"
          value={form.userConcurrent}
          onChange={set('userConcurrent')}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        {!pending && <SaveStatus state={state} />}
      </div>
    </form>
  );
}

/** Строка под кнопкой: что произошло с последним нажатием. */
function SaveStatus({ state }: { state: AdminSettingsState }) {
  if (state.status === 'idle') return null;

  if (state.status === 'error') {
    return (
      <span className="rise text-sm text-[color:var(--ink)]">
        <Dot /> {state.message}
      </span>
    );
  }

  const suffix = state.changed.length > 0 ? `: ${state.changed.join(', ')}` : ' — менять было нечего';
  return (
    <span className="rise text-sm text-[color:var(--muted)]">
      <Dot /> Сохранено{suffix} · {new Date(state.at).toLocaleTimeString('ru-RU')}
    </span>
  );
}

function Dot() {
  return (
    <span
      className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--ink)] align-middle"
      aria-hidden
    />
  );
}
