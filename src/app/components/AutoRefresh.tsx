'use client';

// Перерисовывает серверную страницу раз в `ms`, пока вкладка видна.
// Нужен админке каталога: прогон идёт в воркере, страница только смотрит.

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, ms);
    return () => clearInterval(timer);
  }, [router, ms]);
  return null;
}
