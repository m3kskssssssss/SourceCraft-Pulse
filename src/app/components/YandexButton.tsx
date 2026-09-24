// Кнопка «Войти с Яндекс ID». Серверная форма: действие само уводит на
// oauth.yandex.ru, а оттуда Auth.js возвращает на главную.

import { yandexSignInAction } from '@/app/actions/auth';

export function YandexButton({ label = 'Войти с Яндекс ID' }: { label?: string }) {
  return (
    <form action={yandexSignInAction}>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-3 rounded-full border border-[color:var(--line-2)] bg-[color:var(--paper)] px-5 py-3 text-[15px] font-medium text-[color:var(--ink)] transition hover:bg-[color:var(--panel)]"
      >
        <span
          aria-hidden
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--ink)] text-[13px] font-bold leading-none text-[color:var(--paper)]"
        >
          Я
        </span>
        {label}
      </button>
    </form>
  );
}

/** Разделитель «или» между кнопкой Яндекса и формой с паролем. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-[color:var(--muted-2)]">
      <span className="h-px flex-1 bg-[color:var(--line)]" />
      или по почте
      <span className="h-px flex-1 bg-[color:var(--line)]" />
    </div>
  );
}
