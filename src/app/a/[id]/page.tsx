// Страница отдельного анализа.
// Доступ:
//   - публичный (is_public=true) — открыт всем
//   - иначе только владельцу (requested_by === session.user.id)
// Гость на приватном анализе получает 404 (не палим существование).

import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, repositories } from '@/db/schema';
import { auth } from '@/auth';

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export default async function AnalysisPage({ params }: PageProps) {
  const { id } = await params;

  // Валидация: UUID. Простая проверка длины и разрешённых символов.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.id, id),
  });
  if (!analysis) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!analysis.isPublic && analysis.requestedBy !== userId) notFound();

  const repo = await db.query.repositories.findFirst({
    where: eq(repositories.id, analysis.repositoryId),
  });

  const title = repo ? `${repo.orgSlug}/${repo.repoSlug}` : 'Анализ';

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm text-neutral-500">Анализ</p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      </div>

      {analysis.status === 'queued' || analysis.status === 'running' ? (
        <section className="rounded-3xl bg-neutral-100 p-6">
          <h2 className="text-lg font-medium">Идёт анализ</h2>
          <p className="mt-2 text-neutral-700">
            Статус: {analysis.status === 'queued' ? 'в очереди' : 'выполняется'}. Обновите страницу
            через минуту.
          </p>
        </section>
      ) : analysis.status === 'failed' ? (
        <section className="rounded-3xl bg-neutral-100 p-6">
          <h2 className="text-lg font-medium">Анализ упал</h2>
          <p className="mt-2 text-neutral-700">{analysis.error ?? 'Неизвестная ошибка.'}</p>
        </section>
      ) : (
        <section className="rounded-3xl bg-neutral-100 p-6">
          <h2 className="text-lg font-medium">Готово</h2>
          <p className="mt-2 text-neutral-700">
            Итоговая оценка: <strong>{analysis.score ?? '—'}</strong>. Подробное представление
            появится на Этапе 8 (полировка интерфейса).
          </p>
        </section>
      )}
    </main>
  );
}
