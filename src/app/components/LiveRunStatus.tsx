'use client';

// Статус идущей оценки на карточке «Моих репозиториев».
//
// Раньше карточка показывала «В очереди» по снимку страницы, и прогон мог
// так и стоять: на Vercel его считает запрос POST /api/analyses/<id>/run, а
// дёргала его только страница анализа. Теперь карточка сама:
//   1) запускает прогон, если он ещё в очереди (повтор безопасен — задачу
//      забирает один вызов, остальные получают already_running);
//   2) опрашивает статус и показывает настоящую фазу — «Переоценивается ·
//      Модель читает код»;
//   3) когда оценка готова, перерисовывает страницу с новым баллом.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { stageLabel } from '@/lib/stages';

const POLL_MS = 3_000;

export function LiveRunStatus({
  analysisId,
  initialStatus,
  initialStage,
  again,
}: {
  analysisId: string;
  initialStatus: 'queued' | 'running';
  initialStage: string | null;
  /** У репозитория уже была оценка — значит, это переоценка. */
  again: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(initialStatus);
  const [stage, setStage] = useState<string | null>(initialStage);
  const launched = useRef(false);
  const finished = useRef(false);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    // Ответ не ждём: исход увидит опрос. Обрыв соединения прогон не отменяет.
    fetch(`/api/analyses/${analysisId}/run`, { method: 'POST' }).catch(() => undefined);
  }, [analysisId]);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyses/${analysisId}/status`, { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { status?: string; stage?: string | null };
        if (body.status) setStatus(body.status);
        setStage(body.stage ?? null);
        if ((body.status === 'done' || body.status === 'failed') && !finished.current) {
          finished.current = true;
          router.refresh();
        }
      } catch {
        // Сеть мигнула — спросим в следующий раз.
      }
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [analysisId, router]);

  const label =
    status === 'done'
      ? 'Готово — обновляем'
      : status === 'failed'
        ? 'Оценка не удалась'
        : status === 'queued' && !stage
          ? again
            ? 'Встаёт на переоценку'
            : 'Встаёт в очередь'
          : `${again ? 'Переоценивается' : 'Оценивается'}${stageLabel(stage) ? ` · ${stageLabel(stage)}` : ''}`;

  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--ink)] px-2.5 py-0.5 text-xs font-medium"
    >
      {status !== 'done' && status !== 'failed' && (
        <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--ink)]" />
      )}
      {label}
    </span>
  );
}
