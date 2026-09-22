'use client';

// Прогресс незавершённого анализа на странице /a/<id>.
//
// Делает три вещи:
//   1) дёргает POST /api/analyses/<id>/run — именно этот запрос и считает
//      анализ: отдельного воркера на Vercel нет;
//   2) опрашивает статус и фазу; как только статус стал done или failed,
//      перерисовывает серверную страницу;
//   3) показывает, что происходит: сканирующий глобус, список настоящих фаз
//      и секундомер.
//
// Секундомер считается от `startedAt` — времени постановки в очередь с
// сервера, а не от момента открытия страницы. Поэтому F5 его не сбрасывает:
// анализ идёт своим ходом, и время должно показывать его, а не наше.
//
// Если прогон сорвался и задача вернулась в очередь (мягкий провал, анализ
// снова queued), запускаем ещё раз — до MAX_LAUNCHES попыток. Без этого на
// Vercel никто бы задачу не добрал: воркера, который раньше подхватывал
// очередь, здесь нет.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ANALYSIS_STAGES, stageIndex } from '@/lib/stages';
import { ScanGlobe } from './ScanGlobe';

const POLL_INTERVAL_MS = 2_500;
/** Столько раз со страницы просим пересчитать. Совпадает с MAX_ATTEMPTS на сервере. */
const MAX_LAUNCHES = 3;

type Props = {
  id: string;
  /** Статус на момент рендера страницы. */
  initialStatus: 'queued' | 'running';
  /** Когда анализ встал в очередь, ISO. Отсюда считается секундомер. */
  startedAt: string;
  /** Фаза на момент рендера страницы. */
  initialStage?: string | null;
};

export function AnalysisRunner({ id, initialStatus, startedAt, initialStage }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(initialStatus);
  const [stage, setStage] = useState<string | null>(initialStage ?? null);
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(startedAt));
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
      setFailure('Связь прервалась, ждём результат.');
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
        const data = (await res.json()) as { status?: string; stage?: string | null };
        if (data.stage !== undefined) setStage(data.stage);
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

  // Секундомер: пересчитываем от серверного времени, а не накапливаем сами.
  useEffect(() => {
    const timer = setInterval(() => setElapsed(elapsedSeconds(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const exhausted = launches >= MAX_LAUNCHES && status === 'queued' && !inFlight.current;
  const current = Math.max(0, stageIndex(stage));

  return (
    <div className="flex w-full flex-col gap-7 sm:flex-row sm:items-center sm:gap-9">
      <ScanGlobe className="w-32 self-center sm:w-40 sm:self-auto" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-medium">
            {status === 'queued' && launches === 0 ? 'Запускаем анализ' : 'Идёт анализ'}
          </h2>
          <span className="font-mono text-sm tabular-nums text-[color:var(--muted)]">
            {formatElapsed(elapsed)}
          </span>
        </div>

        <ol className="mt-4 grid gap-1.5">
          {ANALYSIS_STAGES.map((item, idx) => {
            const state = idx < current ? 'done' : idx === current ? 'now' : 'next';
            return (
              <li
                key={item.key}
                className={`flex items-center gap-2.5 text-sm ${
                  state === 'now'
                    ? 'stage-in text-[color:var(--ink)]'
                    : state === 'done'
                      ? 'text-[color:var(--muted)]'
                      : 'text-[color:var(--muted-2)]'
                }`}
              >
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                  {state === 'done' ? (
                    <CheckIcon />
                  ) : (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        state === 'now'
                          ? 'stage-pulse bg-[color:var(--ink)]'
                          : 'bg-[color:var(--line-2)]'
                      }`}
                    />
                  )}
                </span>
                <span className="min-w-0 truncate">{item.label}</span>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 text-xs leading-relaxed text-[color:var(--muted)]">
          Обычно это 20–60 секунд, на большом репозитории — до двух минут. Страница обновится
          сама; её можно закрыть и вернуться позже.
          {launches > 1 ? ` Попытка ${launches} из ${MAX_LAUNCHES}.` : ''}
        </p>

        {failure ? <p className="mt-2 text-sm text-[color:var(--ink)]">{failure}</p> : null}
        {exhausted ? (
          <p className="mt-2 text-sm text-[color:var(--ink)]">
            Расчёт не дошёл до конца. Обновите страницу, чтобы попробовать ещё раз.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function elapsedSeconds(startedAt: string): number {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.round((Date.now() - started) / 1000));
}

function formatElapsed(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
