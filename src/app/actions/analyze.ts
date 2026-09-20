'use server';

// Server action «Запустить анализ». Дёргается формой на главной и страницей
// /analyze (после автоматического возврата из логина).
//
// Что делает:
//   1) Валидирует slug (parseSlug — regex + отсекает мусор).
//   2) Требует авторизованного пользователя (гости уходят на /signin).
//   3) Проверяет через SourceCraft API, что репозиторий существует и public.
//   4) Проверяет лимиты пользователя (в сутки и одновременно в очереди).
//   5) Upsert repositories, insert analyses (status=queued), insert analysis_jobs.
//   6) Редиректит на /a/<id>.

import { redirect } from 'next/navigation';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, analysisJobs, events, repositories } from '@/db/schema';
import { auth } from '@/auth';
import { parseSlug, InvalidSlugError } from '@/lib/slug';
import {
  LIMIT_MESSAGES,
  USER_CONCURRENT_ANALYSIS_LIMIT,
  USER_DAILY_ANALYSIS_LIMIT,
} from '@/lib/limits';
import { getSourcecraftClient } from '@/lib/sourcecraft/client';
import { SourcecraftApiError, SourcecraftNotFoundError } from '@/lib/sourcecraft/errors';

export type AnalyzeState = {
  ok: boolean;
  error?: string;
};

/** Форма-обёртка: reads FormData, вызывает analyzeRepo. */
export async function analyzeAction(
  _prev: AnalyzeState | undefined,
  formData: FormData,
): Promise<AnalyzeState> {
  const target = String(formData.get('target') ?? '');
  return analyzeRepo(target);
}

export async function analyzeRepo(target: string): Promise<AnalyzeState> {
  let org: string;
  let repo: string;
  try {
    ({ org, repo } = parseSlug(target));
  } catch (err) {
    return { ok: false, error: err instanceof InvalidSlugError ? err.message : 'Неверный адрес' };
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    // Гость: сохраняем target и уходим на /signin
    redirect(`/signin?returnTo=${encodeURIComponent(`/analyze?target=${org}/${repo}`)}`);
  }

  // Проверяем существование и публичность через SourceCraft.
  const client = getSourcecraftClient();
  try {
    const repository = await client.getRepository(org, repo);
    if (repository.visibility && repository.visibility !== 'public') {
      return { ok: false, error: 'Приватные и internal-репозитории не поддерживаются.' };
    }
  } catch (err) {
    if (err instanceof SourcecraftNotFoundError) {
      return { ok: false, error: `Репозиторий ${org}/${repo} не найден или недоступен.` };
    }
    if (err instanceof SourcecraftApiError) {
      return { ok: false, error: `SourceCraft вернул ошибку ${err.status}: ${err.message}` };
    }
    return { ok: false, error: 'Не удалось связаться с SourceCraft.' };
  }

  // Лимиты пользователя.
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const dailyRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .where(and(eq(analyses.requestedBy, userId), gte(analyses.createdAt, dayAgo)));
  const dailyCount = dailyRows[0]?.count ?? 0;
  if (dailyCount >= USER_DAILY_ANALYSIS_LIMIT) {
    return { ok: false, error: LIMIT_MESSAGES.daily };
  }

  const concurrentRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .where(
      and(
        eq(analyses.requestedBy, userId),
        inArray(analyses.status, ['queued', 'running']),
      ),
    );
  const concurrentCount = concurrentRows[0]?.count ?? 0;
  if (concurrentCount >= USER_CONCURRENT_ANALYSIS_LIMIT) {
    return { ok: false, error: LIMIT_MESSAGES.concurrent };
  }

  // Upsert репозитория.
  const existingRepo = await db.query.repositories.findFirst({
    where: and(eq(repositories.orgSlug, org), eq(repositories.repoSlug, repo)),
  });
  let repositoryId: string;
  if (existingRepo) {
    repositoryId = existingRepo.id;
  } else {
    const inserted = await db
      .insert(repositories)
      .values({ orgSlug: org, repoSlug: repo })
      .returning({ id: repositories.id });
    if (!inserted[0]) return { ok: false, error: 'Не удалось создать запись о репозитории.' };
    repositoryId = inserted[0].id;
  }

  // Ставим анализ в очередь.
  const [analysis] = await db
    .insert(analyses)
    .values({ repositoryId, requestedBy: userId, status: 'queued' })
    .returning({ id: analyses.id });
  if (!analysis) return { ok: false, error: 'Не удалось создать анализ.' };

  await db.insert(analysisJobs).values({ analysisId: analysis.id });
  await db.insert(events).values({
    userId,
    kind: 'analysis.queued',
    payload: { analysisId: analysis.id, org, repo },
  });

  redirect(`/a/${analysis.id}`);
}
