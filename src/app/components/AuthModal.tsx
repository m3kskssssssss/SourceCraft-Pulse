'use client';

// Модальное окно для входа и регистрации поверх текущей страницы. Открывается
// перехватом маршрута (app/@modal/(.)signin): адрес меняется на /signin, но
// страница под окном остаётся. Закрытие — шаг назад в истории: крестик, Esc,
// клик по фону.

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export function AuthModal({ children }: { children: ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') router.back();
    };
    document.addEventListener('keydown', onKey);
    // Страница под окном не должна прокручиваться вместе с ним.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) router.back();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="rise relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-2)] sm:max-w-md sm:rounded-3xl sm:p-8"
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Закрыть"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--muted)] transition hover:bg-[color:var(--panel)] hover:text-[color:var(--ink)]"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
