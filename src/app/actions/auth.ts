'use server';

// Server actions для регистрации и выхода. Логин делается через POST на
// /api/auth/callback/credentials — форма /signin отправляет туда напрямую,
// потому что Auth.js v5 сам управляет установкой куки.

import { redirect } from 'next/navigation';
import { z } from 'zod';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { signIn, signOut } from '@/auth';

const signUpSchema = z.object({
  email: z.string().email('Неверный email'),
  password: z.string().min(8, 'Пароль от 8 символов').max(200),
  name: z.string().max(120).optional(),
});

export type SignUpState = {
  ok: boolean;
  error?: string;
};

export async function signUpAction(
  _prev: SignUpState | undefined,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name') || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Проверьте форму' };
  }
  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });
  if (existing) {
    return { ok: false, error: 'Пользователь с таким email уже зарегистрирован' };
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await db.insert(users).values({
    email: normalizedEmail,
    name: name ?? null,
    passwordHash,
    provider: 'credentials',
    role: 'user',
  });

  // Автоматически логиним — тем же credentials-провайдером.
  // signIn редиректит сам, поэтому исполнение уйдёт от этой ветки.
  await signIn('credentials', {
    email: normalizedEmail,
    password,
    redirectTo: '/',
  });
  return { ok: true };
}

/** Вход через Яндекс ID: Auth.js уводит на oauth.yandex.ru и возвращает на главную. */
export async function yandexSignInAction(): Promise<void> {
  await signIn('yandex', { redirectTo: '/' });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/' });
  redirect('/');
}

