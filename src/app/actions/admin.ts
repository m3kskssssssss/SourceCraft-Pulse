'use server';

// Server actions админки. Все проверяют admin-cookie (кроме signIn), любая
// удачная/неудачная попытка входа пишется событием.

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { setTimeout as sleep } from 'node:timers/promises';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import argon2 from 'argon2';
import { z } from 'zod';
import { db } from '@/db/client';
import {
  analyses,
  analysisComments,
  analysisJobs,
  analysisRatings,
  events,
  repositories,
  users,
} from '@/db/schema';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SEC,
  signAdminSession,
  verifyAdminSession,
} from '@/lib/admin-session';
import { rateLimit } from '@/lib/rate-limit';
import { claimJobForAnalysis, processAnalysis, type ProcessOutcome } from '@/lib/analysis/run';

const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const FAIL_DELAY_MS = 500;

export type AdminSignInState = { ok: boolean; error?: string };

const signInSchema = z.object({
  login: z.string().min(1).max(120),
  password: z.string().min(1).max(500),
});

export async function adminSignInAction(
  _prev: AdminSignInState | undefined,
  formData: FormData,
): Promise<AdminSignInState> {
  const parsed = signInSchema.safeParse({
    login: formData.get('login'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Заполните оба поля' };
  }

  const ip = await getClientIp();
  const rl = rateLimit(`admin-login:${ip}`, RATE_LIMIT_ATTEMPTS, RATE_LIMIT_WINDOW_MS);
  if (!rl.allowed) {
    await sleep(FAIL_DELAY_MS);
    await recordEvent('admin.login.blocked', { ip });
    return {
      ok: false,
      error: `Слишком много попыток. Повторите через ${Math.ceil(rl.resetInMs / 60_000)} мин.`,
    };
  }

  const configuredLogin = process.env.ADMIN_LOGIN;
  const configuredHash = process.env.ADMIN_PASSWORD_HASH;
  if (!configuredLogin || !configuredHash) {
    await sleep(FAIL_DELAY_MS);
    await recordEvent('admin.login.fail', { ip, reason: 'not_configured' });
    return { ok: false, error: 'Админ-учётка не настроена. Проверьте ADMIN_LOGIN и ADMIN_PASSWORD_HASH в окружении.' };
  }

  const loginOk = safeEqual(parsed.data.login, configuredLogin);
  let passwordOk = false;
  try {
    passwordOk = await argon2.verify(configuredHash, parsed.data.password);
  } catch {
    passwordOk = false;
  }

  if (!(loginOk && passwordOk)) {
    await sleep(FAIL_DELAY_MS);
    await recordEvent('admin.login.fail', { ip, loginTried: parsed.data.login });
    return { ok: false, error: 'Неверный логин или пароль' };
  }

  const token = signAdminSession(configuredLogin);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SEC,
  });

  await recordEvent('admin.login.success', { ip });
  redirect('/admin');
}

export async function adminSignOutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE_NAME);
  redirect('/admin/login');
}

// ---------- helpers доступа ----------

/** Требует активную админ-сессию. Кидает при отсутствии. */
export async function requireAdmin(): Promise<{ login: string }> {
  const jar = await cookies();
  const raw = jar.get(ADMIN_COOKIE_NAME)?.value;
  const payload = verifyAdminSession(raw);
  if (!payload) {
    redirect('/admin/login');
  }
  return { login: payload.login };
}

// ---------- Админ-действия над данными ----------

const idSchema = z.string().regex(/^[0-9a-f-]{36}$/i);

/** Чем админка подписывает лок задачи. */
const ADMIN_RUNNER_ID = 'admin:panel';
/** Сколько задач берём за один прогон очереди. */
const QUEUE_BATCH = 10;
/** Сколько времени на прогон: остаток от maxDuration страницы оставляем записи. */
const QUEUE_TIME_BUDGET_MS = 240_000;
/** Повтор условий очереди из lib/analysis/run: больше попыток не берём. */
const MAX_QUEUE_ATTEMPTS = 3;
const STALE_LOCK_MS = 6 * 60 * 1000;

/** Перезапуск упавшей задачи (или сброс лока текущей): очищаем lock, снижаем attempts. */
export async function adminRerunJob(analysisId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(analysisId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };

  const existing = await db.query.analysisJobs.findFirst({
    where: eq(analysisJobs.analysisId, analysisId),
  });
  if (!existing) {
    await db.insert(analysisJobs).values({ analysisId });
  } else {
    await db
      .update(analysisJobs)
      .set({ attempts: 0, lockedAt: null, lockedBy: null, lastError: null })
      .where(eq(analysisJobs.id, existing.id));
  }
  await db.update(analyses).set({ status: 'queued', error: null }).where(eq(analyses.id, analysisId));
  await recordEvent('admin.job.rerun', { analysisId });
  return { ok: true };
}

/**
 * Считает задачу прямо здесь, в этом же запросе, — так же, как это делает
 * /api/analyses/<id>/run. Отдельного воркера в проде нет, и «перезапустить»
 * без этого означало лишь «сбросить лок и ждать у моря погоды».
 */
export async function adminRunJobNow(
  analysisId: string,
): Promise<{ ok: boolean; outcome?: ProcessOutcome; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(analysisId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };

  const job = await claimJobForAnalysis(db, analysisId, ADMIN_RUNNER_ID);
  if (!job) return { ok: false, error: 'Задачу уже кто-то считает' };

  await recordEvent('admin.job.run', { analysisId });
  const outcome = await processAnalysis(db, job, ADMIN_RUNNER_ID);
  return { ok: true, outcome };
}

/**
 * Прогоняет очередь подряд, пока хватает времени функции. Лимит сознательно
 * ниже maxDuration страницы: последнему анализу нужно успеть записаться.
 */
export async function adminRunQueue(): Promise<{ ok: boolean; done: number }> {
  await requireAdmin();
  const started = Date.now();
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);

  const pending = await db
    .select({ analysisId: analysisJobs.analysisId })
    .from(analysisJobs)
    .where(
      and(
        lt(analysisJobs.attempts, MAX_QUEUE_ATTEMPTS),
        or(isNull(analysisJobs.lockedAt), lt(analysisJobs.lockedAt, staleBefore)),
      ),
    )
    .limit(QUEUE_BATCH);

  let done = 0;
  for (const row of pending) {
    if (Date.now() - started > QUEUE_TIME_BUDGET_MS) break;
    const job = await claimJobForAnalysis(db, row.analysisId, ADMIN_RUNNER_ID);
    if (!job) continue;
    await processAnalysis(db, job, ADMIN_RUNNER_ID);
    done += 1;
  }

  await recordEvent('admin.queue.run', { done, requested: pending.length });
  return { ok: true, done };
}

/**
 * Снимает задачу с очереди. Сам анализ остаётся в базе, но висеть «в очереди»
 * ему больше не с чем, поэтому помечаем его упавшим с внятной причиной.
 */
export async function adminDeleteJob(jobId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(jobId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };

  const job = await db.query.analysisJobs.findFirst({ where: eq(analysisJobs.id, jobId) });
  if (!job) return { ok: false, error: 'Задача уже снята' };

  await db.delete(analysisJobs).where(eq(analysisJobs.id, jobId));
  await db
    .update(analyses)
    .set({
      status: 'failed',
      error: 'Снят из очереди администратором',
      finishedAt: new Date(),
    })
    .where(
      and(
        eq(analyses.id, job.analysisId),
        or(eq(analyses.status, 'queued'), eq(analyses.status, 'running')),
      ),
    );

  await recordEvent('admin.job.deleted', { jobId, analysisId: job.analysisId });
  return { ok: true };
}

/** Удаляет один прогон. Задача из очереди уходит каскадом по внешнему ключу. */
export async function adminDeleteAnalysis(
  analysisId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(analysisId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };

  await db.delete(analyses).where(eq(analyses.id, analysisId));
  await recordEvent('admin.analysis.deleted', { analysisId });
  return { ok: true };
}

/**
 * Удаляет репозиторий вместе со всеми его оценками: analyses и analysis_jobs
 * уходят каскадом, записи ai_calls остаются с обнулённой ссылкой — расходы
 * за месяц из-за уборки не должны меняться задним числом.
 */
export async function adminDeleteRepository(
  repositoryId: string,
): Promise<{ ok: boolean; deletedAnalyses?: number; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(repositoryId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };

  const doomed = await db
    .select({ id: analyses.id })
    .from(analyses)
    .where(eq(analyses.repositoryId, repositoryId));

  await db.delete(repositories).where(eq(repositories.id, repositoryId));
  await recordEvent('admin.repository.deleted', {
    repositoryId,
    deletedAnalyses: doomed.length,
  });
  return { ok: true, deletedAnalyses: doomed.length };
}

export async function adminToggleBlock(
  userId: string,
  block: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };
  await db
    .update(users)
    .set({ blockedAt: block ? new Date() : null })
    .where(eq(users.id, userId));
  await recordEvent(block ? 'admin.user.blocked' : 'admin.user.unblocked', { userId });
  return { ok: true };
}

/**
 * Удаляет пользователя. Что уходит следом, задано внешними ключами схемы:
 * оценки, комментарии, сессии и привязки провайдеров — каскадом, а его
 * анализы остаются в рейтинге с обнулённым автором. Это осознанно: чужой
 * опубликованный разбор не должен исчезать из общего списка из-за уборки
 * учётных записей.
 */
export async function adminDeleteUser(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };

  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const victim = rows[0];
  if (!victim) return { ok: false, error: 'Пользователь не найден' };

  await db.delete(users).where(eq(users.id, userId));
  await recordEvent('admin.user.deleted', { userId, email: victim.email });
  return { ok: true };
}

/** Убирает одну оценку. Средняя по анализу пересчитается сама. */
export async function adminDeleteRating(
  ratingId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(ratingId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };
  await db.delete(analysisRatings).where(eq(analysisRatings.id, ratingId));
  await recordEvent('admin.rating.deleted', { ratingId });
  return { ok: true };
}

/**
 * Убирает комментарий. В отличие от удаления самим автором — начисто, вместе
 * с ответами на него: модерации нужна пустая ветка, а не «удалено» с живой
 * перепиской под ним.
 */
export async function adminDeleteComment(
  commentId: string,
): Promise<{ ok: boolean; deletedReplies?: number; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(commentId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };

  const replies = await db
    .select({ id: analysisComments.id })
    .from(analysisComments)
    .where(eq(analysisComments.parentId, commentId));

  if (replies.length > 0) {
    await db.delete(analysisComments).where(eq(analysisComments.parentId, commentId));
  }
  await db.delete(analysisComments).where(eq(analysisComments.id, commentId));
  await recordEvent('admin.comment.deleted', { commentId, deletedReplies: replies.length });
  return { ok: true, deletedReplies: replies.length };
}

export async function adminUnpublishAnalysis(
  analysisId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(analysisId);
  if (!parsed.success) return { ok: false, error: 'Некорректный id' };
  await db
    .update(analyses)
    .set({ isPublic: false })
    .where(and(eq(analyses.id, analysisId), eq(analyses.isPublic, true)));
  await recordEvent('admin.analysis.unpublished', { analysisId });
  return { ok: true };
}

// ---------- Форм-обёртки ----------

export async function adminRerunJobAction(formData: FormData): Promise<void> {
  const id = String(formData.get('analysisId') ?? '');
  await adminRerunJob(id);
  revalidatePath('/admin/queue');
}

export async function adminRunJobNowAction(formData: FormData): Promise<void> {
  const id = String(formData.get('analysisId') ?? '');
  await adminRunJobNow(id);
  revalidatePath('/admin/queue');
  revalidatePath('/admin');
}

export async function adminRunQueueAction(): Promise<void> {
  await adminRunQueue();
  revalidatePath('/admin/queue');
  revalidatePath('/admin');
}

export async function adminDeleteAnalysisAction(formData: FormData): Promise<void> {
  const id = String(formData.get('analysisId') ?? '');
  await adminDeleteAnalysis(id);
  revalidatePath('/admin/repositories');
  revalidatePath('/admin/queue');
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function adminDeleteRepositoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get('repositoryId') ?? '');
  await adminDeleteRepository(id);
  revalidatePath('/admin/repositories');
  revalidatePath('/admin/queue');
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function adminDeleteJobAction(formData: FormData): Promise<void> {
  const id = String(formData.get('jobId') ?? '');
  await adminDeleteJob(id);
  revalidatePath('/admin/queue');
  revalidatePath('/admin');
}

export async function adminToggleBlockAction(formData: FormData): Promise<void> {
  const id = String(formData.get('userId') ?? '');
  const next = formData.get('next') === '1';
  await adminToggleBlock(id, next);
}

export async function adminUnpublishAction(formData: FormData): Promise<void> {
  const id = String(formData.get('analysisId') ?? '');
  await adminUnpublishAnalysis(id);
}

export async function adminDeleteUserAction(formData: FormData): Promise<void> {
  const id = String(formData.get('userId') ?? '');
  await adminDeleteUser(id);
  revalidatePath('/admin/users');
  revalidatePath('/admin/social');
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function adminDeleteRatingAction(formData: FormData): Promise<void> {
  const id = String(formData.get('ratingId') ?? '');
  await adminDeleteRating(id);
  revalidatePath('/admin/social');
  revalidatePath('/');
}

export async function adminDeleteCommentAction(formData: FormData): Promise<void> {
  const id = String(formData.get('commentId') ?? '');
  await adminDeleteComment(id);
  revalidatePath('/admin/social');
  revalidatePath('/');
}

// ---------- утилиты ----------

async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip')?.trim() ??
    'unknown'
  );
}

/** Постоянная по времени сверка строк. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function recordEvent(kind: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await db.insert(events).values({ kind, payload });
  } catch {
    // журнал не должен ломать основной flow
  }
}
