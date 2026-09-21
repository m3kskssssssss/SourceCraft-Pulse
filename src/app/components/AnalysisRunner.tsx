'use client';

// Прогресс незавершённого анализа на странице /a/<id>.
//
// Делает две вещи:
//   1) дёргает POST /api/analyses/<id>/run — именно этот запрос и считает
//      анализ: отдельного воркера на Vercel нет;
//   2) опрашивает статус и, как только он стал done или failed, перерисовывает
//      серверную страницу. Раньше здесь была просьба «обновите страницу через
//      минуту» — из-за неё готовый анализ минутами выглядел незаконченным.
//
// Если прогон сорвался и задача вернулась в очередь (мягкий провал, анализ
// снова queued), запускаем ещё раз — до MAX_LAUNCHES попыток. Без этого на
// Vercel никто бы задачу не добрал: воркера, который раньше подхватывал
// очередь, здесь нет.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL_MS = 2_500;
/** Столько раз со страницы просим пересчитать. Совпадает с MAX_ATTEMPTS на сервере. */
const MAX_LAUNCHES = 3;

type Props = {
  id: string;
  /** Статус на момент рендера страницы. */
  initialStatus: 'queued' | 'running';
};

export function AnalysisRunner({ id, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(initialStatus);
  const [seconds, setSeconds] = useState(0);
  const [launches, setLaunches] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);

  const inFlight = useRef(false);
  const launchCount = useRef(0);

  const launch = useCallback(async () => {
    if (inFlight.current || launchCount.current >= MAX_LAUNCHES) return;
    inFlight.current = true;
    launchCount.current += 1;
    setLaunches(launchCount.current);

    try {
      const res = await fetch(`/api/analyses/${id}/run`, { method: 'POST' });
      if (!res.ok) {
        setFailure(`Не удалось запустить расчёт (${res.status}).`);
        return;
      }
      setFailure(null);
      router.refresh();
    } catch {
      // Сеть отвалилась, но расчёт мог уже уйти на сервер: продолжаем опрос.
      setFailure('Связь прервалась. Ждём результат.');
    } finally {
      inFlight.current = false;
    }
  }, [id, router]);

  // Первый запуск.
  useEffect(() => {
    void launch();
  }, [launch]);

  // Опрос статуса; заодно добираем задачу, если она вернулась в очередь.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyses/${id}/status`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string };
        if (!data.status) return;
        setStatus(data.status);

        if (data.status === 'done' || data.status === 'failed') {
          clearInterval(timer);
          router.refresh();
          return;
        }
        // queued при отсутствии прогона — предыдущая попытка сорвалась.
        if (data.status === 'queued' && !inFlight.current) {
          void launch();
        }
      } catch {
        // Разрыв сети — молча ждём следующего тика.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [id, router, launch]);

  // Счётчик секунд — видно, что процесс идёт.
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const exhausted = launches >= MAX_LAUNCHES && status === 'queued' && !inFlight.current;

  return (
    <div>
      <h2 className="text-lg font-medium">
        {status === 'queued' && launches === 0 ? 'Запускаем анализ' : 'Идёт анализ'}
      </h2>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Собираем данные из SourceCraft, читаем репозиторий, считаем метрики и спрашиваем модель.
        Обычно это занимает 20–60 секунд — страница обновится сама.
      </p>
      <p className="mt-3 text-xs tabular-nums text-[color:var(--muted)]">
        прошло {seconds} с{launches > 1 ? ` · попытка ${launches} из ${MAX_LAUNCHES}` : ''}
      </p>
      {failure ? <p className="mt-3 text-sm text-[color:var(--ink)]">{failure}</p> : null}
      {exhausted ? (
        <p className="mt-3 text-sm text-[color:var(--ink)]">
          Расчёт не дошёл до конца. Обновите страницу, чтобы попробовать ещё раз.
        </p>
      ) : null}
    </div>
  );
}
