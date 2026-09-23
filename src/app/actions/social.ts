'use server';

// Оценка анализа и обсуждение под ним.
//
// Писать может только вошедший пользователь и только под тем анализом,
// который ему виден: приватный чужой прогон не должен получать ни звёзд, ни
// комментариев — иначе по отклику можно узнать, что он существует.

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { analyses, analysisComments, analysisRatings } from '@/db/schema';
import { MAX_RATING } from '@/lib/social-shared';
import { isUuid } from '@/lib/user-display';

export type SocialState = { ok: boolean; error?: string };

const ratingSchema = z.object({
  analysisId: z.string().uuid(),
  value: z.coerce.number().int().min(1).max(MAX_RATING),
});

const commentSchema = z.object({
  analysisId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  body: z.string().trim().min(1, 'Пустой комментарий').max(4000, 'Слишком длинно'),
});

/** Кто смотрит и виден ли ему этот анализ. */
async function requireVisibleAnalysis(
  analysisId: string,
): Promise<{ userId: string } | { error: string }> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: 'Войдите, чтобы оставить отклик' };

  const rows = await db
    .select({ isPublic: analyses.isPublic, requestedBy: analyses.requestedBy })
    .from(analyses)
    .where(eq(analyses.id, analysisId))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: 'Анализ не найден' };
  if (!row.isPublic && row.requestedBy !== userId) return { error: 'Анализ не найден' };
  return { userId };
}

export async function rateAnalysisAction(
  _prev: SocialState | undefined,
  formData: FormData,
): Promise<SocialState> {
  const parsed = ratingSchema.safeParse({
    analysisId: formData.get('analysisId'),
    value: formData.get('value'),
  });
  if (!parsed.success) return { ok: false, error: 'Оценка от 1 до 5' };

  const access = await requireVisibleAnalysis(parsed.data.analysisId);
  if ('error' in access) return { ok: false, error: access.error };

  // Одна оценка на пользователя: повторная просто переписывает прежнюю.
  await db
    .insert(analysisRatings)
    .values({
      analysisId: parsed.data.analysisId,
      userId: access.userId,
      value: parsed.data.value,
    })
    .onConflictDoUpdate({
      target: [analysisRatings.analysisId, analysisRatings.userId],
      set: { value: parsed.data.value, updatedAt: new Date() },
    });

  revalidatePath(`/a/${parsed.data.analysisId}`);
  revalidatePath('/');
  return { ok: true };
}

export async function addCommentAction(
  _prev: SocialState | undefined,
  formData: FormData,
): Promise<SocialState> {
  const parsed = commentSchema.safeParse({
    analysisId: formData.get('analysisId'),
    parentId: formData.get('parentId') || undefined,
    body: formData.get('body'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Проверьте текст' };
  }

  const access = await requireVisibleAnalysis(parsed.data.analysisId);
  if ('error' in access) return { ok: false, error: access.error };

  // Вложенность ровно одна: ответ на ответ прикрепляется к тому же корню.
  let parentId: string | null = null;
  if (parsed.data.parentId) {
    const rows = await db
      .select({ id: analysisComments.id, parentId: analysisComments.parentId })
      .from(analysisComments)
      .where(
        and(
          eq(analysisComments.id, parsed.data.parentId),
          eq(analysisComments.analysisId, parsed.data.analysisId),
        ),
      )
      .limit(1);
    const parent = rows[0];
    if (!parent) return { ok: false, error: 'Комментарий, на который вы отвечаете, исчез' };
    parentId = parent.parentId ?? parent.id;
  }

  await db.insert(analysisComments).values({
    analysisId: parsed.data.analysisId,
    userId: access.userId,
    parentId,
    body: parsed.data.body,
  });

  revalidatePath(`/a/${parsed.data.analysisId}`);
  revalidatePath('/');
  return { ok: true };
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const id = String(formData.get('commentId') ?? '');
  if (!isUuid(id)) return;

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return;

  // Мягкое удаление: текст исчезает, ветка ответов остаётся на месте.
  const updated = await db
    .update(analysisComments)
    .set({ deletedAt: new Date(), body: '', updatedAt: new Date() })
    .where(
      and(
        eq(analysisComments.id, id),
        eq(analysisComments.userId, userId),
        isNull(analysisComments.deletedAt),
      ),
    )
    .returning({ analysisId: analysisComments.analysisId });

  const analysisId = updated[0]?.analysisId;
  if (analysisId) {
    revalidatePath(`/a/${analysisId}`);
    revalidatePath('/');
  }
}
