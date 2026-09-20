'use server';

// Server actions админки. Все проверяют admin-cookie (кроме signIn), любая
// удачная/неудачная попытка входа пишется событием.

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { setTimeout as sleep } from 'node:timers/promises';
import { and, eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { z } from 'zod';
import { db } from '@/db/client';
import { analyses, analysisJobs, events, users } from '@/db/schema';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SEC,
  signAdminSession,
  verifyAdminSession,
} from '@/lib/admin-session';
import { rateLimit } from '@/lib/rate-limit';

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
