'use client';

// Кнопка отправки формы, которая сначала переспрашивает.
//
// Нужна там, где действие необратимо: удаление прогона или репозитория со
// всеми его оценками. Серверная форма сама по себе спросить не может.

export function ConfirmSubmit({
  children,
  question,
  tone = 'outline',
}: {
  children: React.ReactNode;
  /** Текст в окне подтверждения. */
  question: string;
  tone?: 'outline' | 'danger';
}) {
  const look =
    tone === 'danger'
      ? 'border border-[color:var(--accent-activity)] text-[color:var(--accent-activity)] hover:bg-[color:var(--accent-activity)] hover:text-[color:var(--paper)]'
      : 'border border-[color:var(--line)] hover:bg-[color:var(--panel)]';

  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition active:scale-[0.97] ${look}`}
    >
      {children}
    </button>
  );
}
