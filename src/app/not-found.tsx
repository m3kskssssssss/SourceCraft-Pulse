import Link from 'next/link';
import { Chip } from './components/ui';
import { Planet } from './components/Planet';

export default function NotFound() {
  return (
    <main className="relative mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-24 text-center">
      <div className="pointer-events-none absolute left-1/2 top-10 -z-10 -translate-x-1/2">
        <Planet size={340} variant="backdrop" />
      </div>
      <div className="mx-auto">
        <Chip tone="outline">404</Chip>
      </div>
      <h1 className="text-4xl font-semibold tracking-tight">Здесь ничего нет</h1>
      <p className="text-sm text-[color:var(--muted)]">
        Ссылка устарела или анализ не создан.
      </p>
      <div className="mx-auto flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)] hover:bg-[color:var(--ink-2)]"
        >
          На главную
        </Link>
        <Link
          href="/analyze"
          className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm hover:bg-[color:var(--panel)]"
        >
          Оценить репозиторий
        </Link>
      </div>
    </main>
  );
}
