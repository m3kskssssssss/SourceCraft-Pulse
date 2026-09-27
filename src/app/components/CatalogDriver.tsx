'use client';

// Пока прогон каталога включён, по кругу зовёт диспетчер /api/cron/catalog-run.
// Один вызов живёт до пяти минут и сам держит три оценки; следующий уходит,
// когда предыдущий ответил. Так прогон идёт от открытой админки и без
// внешнего планировщика; с закрытой вкладкой его ведёт крон.

import { useEffect } from 'react';

/** Пауза между вызовами, если диспетчеру нечего было запускать. */
const IDLE_PAUSE_MS = 20_000;

export function CatalogDriver({ running }: { running: boolean }) {
  useEffect(() => {
    if (!running) return;
    let stopped = false;
    void (async () => {
      while (!stopped) {
        let launched = 0;
        try {
          const res = await fetch('/api/cron/catalog-run', { method: 'POST' });
          if (res.ok) launched = ((await res.json()) as { launched?: number }).launched ?? 0;
        } catch {
          // сеть моргнула — попробуем после паузы
        }
        if (launched === 0) await new Promise((r) => setTimeout(r, IDLE_PAUSE_MS));
      }
    })();
    return () => {
      stopped = true;
    };
  }, [running]);
  return null;
}
