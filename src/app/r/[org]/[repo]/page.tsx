// Публичная карточка репозитория. Показывает последний опубликованный анализ.
// Если публичной записи нет — пустое состояние с приглашением оценить.

import Link from 'next/link';
import { getLatestPublicAnalysis } from '@/lib/ranking';

type PageProps = { params: Promise<{ org: string; repo: string }> };

export const revalidate = 60;

export default async function RepositoryPage({ params }: PageProps) {
  const { org, repo } = await params;

  const latest = await getLatestPublicAnalysis(org, repo);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm text-neutral-500">Карточка репозитория</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {org}/{repo}
      </h1>

      {latest ? (
        <section className="mt-10 rounded-3xl bg-neutral-100 p-6">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-medium">Оценка</h2>
              <p className="text-sm text-neutral-500">
                {latest.language ?? 'язык не определён'}
                {latest.publishedAt ? ` · опубликовано ${formatDate(latest.publishedAt)}` : ''}
              </p>
            </div>
            <div className="text-5xl font-semibold tabular-nums">{latest.score ?? '—'}</div>
          </div>
          <div className="mt-4 flex gap-3 text-sm">
            <Link href={`/a/${latest.id}`} className="underline underline-offset-2">
              Подробности анализа
            </Link>
            <Link
              href={`/api/badge/${org}/${repo}.svg`}
              className="underline underline-offset-2"
              prefetch={false}
            >
              SVG-бейдж
            </Link>
          </div>
        </section>
      ) : (
        <section className="mt-10 rounded-3xl bg-neutral-100 p-6">
          <h2 className="text-lg font-medium">Ещё не оценён</h2>
          <p className="mt-2 text-neutral-600">
            Опубликованного анализа для этого репозитория пока нет. Запустите оценку с главной.
          </p>
          <Link href="/" className="mt-4 inline-block underline underline-offset-2">
            На главную →
          </Link>
        </section>
      )}
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
}
