'use client';

// «Догрузить аналитику» во вкладке админки «Коммиты»: зовёт /api/cron/backfill
// по кругу, пока не кончатся анализы без сводки ревью и пустых коммитов.
// Один вызов живёт до пяти минут, прогресс показываем по ответам. Вкладку
// нужно держать открытой; закрыли — остальное доделает крон синхронизации.

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Part = { processed?: number; filled?: number; failed?: number; remaining?: number };
type Reply = { reviews?: Part; emptyCommits?: Part; error?: string };

export function BackfillButton({ pending }: { pending: { reviews: number; emptyCommits: number } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const nothing = pending.reviews + pending.emptyCommits === 0;

  async function run() {
    setBusy(true);
    setNote('Догружаем…');
    const total = { reviews: 0, emptyCommits: 0, failed: 0 };
    try {
      for (let round = 0; round < 40; round += 1) {
        const res = await fetch('/api/cron/backfill', { method: 'POST' });
        const reply = (await res.json().catch(() => ({}))) as Reply;
        if (!res.ok) {
          setNote(`Не вышло: ${reply.error ?? res.status}`);
          return;
        }
        total.reviews += reply.reviews?.filled ?? 0;
        total.emptyCommits += reply.emptyCommits?.filled ?? 0;
        total.failed += (reply.reviews?.failed ?? 0) + (reply.emptyCommits?.failed ?? 0);
        const left = (reply.reviews?.remaining ?? 0) + (reply.emptyCommits?.remaining ?? 0);
        setNote(
          `Ревью: ${total.reviews}, пустые коммиты: ${total.emptyCommits}, не вышло: ${total.failed}. ` +
            `Осталось: ${reply.reviews?.remaining ?? 0} и ${reply.emptyCommits?.remaining ?? 0}.`,
        );
        router.refresh();
        const progressed = (reply.reviews?.processed ?? 0) + (reply.emptyCommits?.processed ?? 0);
        if (left === 0 || progressed === 0) break;
      }
    } catch {
      setNote('Сеть оборвалась — догрузка на сервере могла дойти до конца, обновите страницу.');
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
        disabled={busy || nothing}
        className="rounded-full border border-[color:var(--line-2)] px-5 py-2 text-sm font-medium transition active:scale-[0.97] hover:bg-[color:var(--panel)] disabled:opacity-40"
      >
        {busy ? 'Догружаем…' : 'Догрузить аналитику'}
      </button>
      <p className="max-w-sm text-xs text-[color:var(--muted)] sm:text-right">
        {note ??
          (nothing
            ? 'Ревью и пустые коммиты есть у всех оценок.'
            : `Ждут: ревью — ${pending.reviews}, пустые коммиты — ${pending.emptyCommits}. Без ИИ, балл не меняется.`)}
      </p>
    </div>
  );
}
