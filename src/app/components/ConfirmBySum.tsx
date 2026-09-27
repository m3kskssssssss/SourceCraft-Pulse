'use client';

// Кнопка массового удаления с подтверждением в модальном окне: чтобы
// действие прошло, нужно решить пример на сложение двух однозначных чисел.
// Обычный confirm() на телефоне проскакивает одним касанием, а здесь
// случайно не нажмёшь. Пример новый при каждом открытии.

import { useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

export function ConfirmBySum({
  action,
  fields,
  label,
  title,
  description,
  disabled = false,
}: {
  action: (formData: FormData) => Promise<void>;
  /** Скрытые поля формы. */
  fields: Record<string, string>;
  label: React.ReactNode;
  title: string;
  description: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pair, setPair] = useState<[number, number]>([1, 1]);
  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const show = (): void => {
    setPair([1 + Math.floor(Math.random() * 9), 1 + Math.floor(Math.random() * 9)]);
    setAnswer('');
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    // Страница под окном не прокручивается — на iPhone иначе уезжает фон.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const correct = answer.trim() !== '' && Number(answer.trim()) === pair[0] + pair[1];

  return (
    <>
      <button
        type="button"
        onClick={show}
        disabled={disabled}
        className="w-full rounded-full border border-[color:var(--accent-activity)] px-4 py-2 text-sm text-[color:var(--accent-activity)] transition hover:bg-[color:var(--accent-activity)] hover:text-[color:var(--paper)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="modal-in w-full max-w-md rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper)] p-5 shadow-[var(--shadow-2)] sm:p-6"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            <div className="mt-2 text-sm leading-relaxed text-[color:var(--ink-2)]">{description}</div>

            <form
              action={async (formData) => {
                await action(formData);
                setOpen(false);
              }}
              className="mt-5"
              onSubmit={(event) => {
                if (!correct) event.preventDefault();
              }}
            >
              {Object.entries(fields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <label className="block text-sm text-[color:var(--muted)]">
                Чтобы подтвердить, решите пример:
                <span className="mt-2 flex items-center gap-3">
                  <span className="font-mono text-2xl font-semibold tabular-nums text-[color:var(--ink)]">
                    {pair[0]} + {pair[1]} =
                  </span>
                  <input
                    ref={inputRef}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    aria-label="Ответ"
                    // 16px — иначе Safari на iPhone приближает страницу при фокусе.
                    className="w-20 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper-2)] px-3 py-2 font-mono text-base tabular-nums outline-none focus:border-[color:var(--ink)]"
                  />
                </span>
              </label>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm transition hover:bg-[color:var(--panel)]"
                >
                  Отмена
                </button>
                <SubmitButton enabled={correct} />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className="rounded-full bg-[color:var(--accent-activity)] px-4 py-2 text-sm text-[color:var(--paper)] transition active:scale-[0.98] disabled:opacity-40"
    >
      {pending ? 'Удаляем…' : 'Удалить'}
    </button>
  );
}
