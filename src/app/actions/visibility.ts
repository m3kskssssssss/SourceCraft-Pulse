'use server';

// Server action переключения публикации анализа.
// Правила:
//   - только владелец анализа может изменить видимость;
//   - при is_public=true все старые публичные анализы того же репозитория
//     переводятся в приватные — в рейтинге живёт одна свежая запись;
//   - выключение публикации не трогает другие анализы, старые остаются
//     доступны по прямой ссылке /a/<id> как история.

import { revalidatePath } from 'next/cache';
import { and, eq, ne } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { analyses, events } from '@/db/schema';

export type VisibilityState = { ok: boolean; error?: string };

export async function setAnalysisVisibility(
  analysisId: string,
  isPublic: boolean,
): Promise<VisibilityState> {
  if (!/^[0-9a-f-]{36}$/i.test(analysisId)) {
    return { ok: false, error: 'Некорректный id анализа' };
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: 'Требуется вход' };

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.id, analysisId),
  });
  if (!analysis) return { ok: false, error: 'Анализ не найден' };
  if (analysis.requestedBy !== userId) {
    return { ok: false, error: 'Изменять видимость может только владелец' };
  }
  if (analysis.status !== 'done') {
    return { ok: false, error: 'Публиковать можно только завершённый анализ' };
  }

  if (isPublic) {
    // Сбрасываем публичный флаг у остальных анализов того же репозитория.
    await db
      .update(analyses)
      .set({ isPublic: false })
      .where(
        and(
          eq(analyses.repositoryId, analysis.repositoryId),
          ne(analyses.id, analysisId),
          eq(analyses.isPublic, true),
        ),
      );
  }

  await db.update(analyses).set({ isPublic }).where(eq(analyses.id, analysisId));

  await db.insert(events).values({
    userId,
    kind: isPublic ? 'analysis.published' : 'analysis.unpublished',
    payload: { analysisId },
  });

  revalidatePath(`/a/${analysisId}`);
  revalidatePath(`/u/${userId}`);
  revalidatePath('/');
  return { ok: true };
}

/** Форм-обёртка для UI-переключателя. */
export async function toggleVisibilityAction(formData: FormData): Promise<void> {
  const id = String(formData.get('analysisId') ?? '');
  const next = formData.get('next') === '1';
  await setAnalysisVisibility(id, next);
}
