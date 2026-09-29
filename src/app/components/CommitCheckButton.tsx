'use client';

// «Проверить сейчас» во вкладке админки «Коммиты». Первый вызов
// /api/cron/commit-check с `force=1` начинает окно проверки с этого момента;
// дальше зовём без него, пока не сверено всё и не досчитаны переоценки.
// Один вызов живёт до пяти минут, поэтому прогресс показываем по ответам.

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Reply = {
  checked?: number;
  unchanged?: number;
  changed?: number;
  errors?: number;
  remaining?: number;
  launched?: number;
  error?: string;
};

export function CommitCheckButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setNote('Сверяем верхушки веток…');
    const total = { checked: 0, unchanged: 0, changed: 0, errors: 0, launched: 0 };
    try {
      for (let round = 0; round < 20; round += 1) {
        const res = await fetch(`/api/cron/commit-check${round === 0 ? '?force=1' : ''}`, { method: 'POST' });
        const reply = (await res.json().catch(() => ({}))) as Reply;
        if (!res.ok) {
          setNote(`Не вышло: ${reply.error ?? res.status}`);
          return;
        }
        total.checked += reply.checked ?? 0;
        total.unchanged += reply.unchanged ?? 0;
        total.changed += reply.changed ?? 0;
        total.errors += reply.errors ?? 0;
        total.launched += reply.launched ?? 0;
        setNote(
          `Проверено ${total.checked}: без изменений ${total.unchanged}, с новыми коммитами ${total.changed}, ` +
            `ошибок ${total.errors}; переоценок запущено ${total.launched}.`,
        );
        router.refresh();
        // Всё сверено и новых переоценок этот вызов не брал — готово.
        if ((reply.remaining ?? 0) === 0 && (reply.launched ?? 0) === 0) break;
      }
    } catch {
      setNote('Сеть оборвалась — проверка на сервере могла дойти до конца, обновите страницу.');
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={run}
        disabled={busy || disabled}
        className="rounded-full bg-[color:var(--ink)] px-5 py-2 text-sm font-medium text-[color:var(--paper)] transition active:scale-[0.97] hover:bg-[color:var(--ink-2)] disabled:opacity-40"
      >
        {busy ? 'Проверяем…' : 'Проверить сейчас'}
      </button>
      {note && <p className="max-w-sm text-xs text-[color:var(--muted)] sm:text-right">{note}</p>}
    </div>
  );
}
