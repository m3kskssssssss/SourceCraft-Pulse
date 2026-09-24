// Node-полный конфиг Auth.js. Используется в API-роуте и server actions,
// где доступны argon2 и Drizzle-клиент. Edge-safe вариант — см. auth.config.ts.

import NextAuth, { type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Yandex from 'next-auth/providers/yandex';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { z } from 'zod';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { authConfig } from './auth.config';
import { upsertYandexUser } from '@/lib/yandex-auth';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

/** Вход через Яндекс ID включается, только когда заданы ключи приложения. */
export const yandexEnabled = Boolean(process.env.AUTH_YANDEX_ID && process.env.AUTH_YANDEX_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Яндекс: заводим или находим пользователя до выдачи сессии. Вернуть
    // false — значит не пускать: так отказываем заблокированным.
    async signIn({ account, profile }) {
      if (account?.provider !== 'yandex') return true;
      const user = await upsertYandexUser(profile);
      return Boolean(user && !user.blocked);
    },
    // В токен кладём id из нашей базы, а не из Яндекса: всё остальное в
    // приложении ищет пользователя по нему. Повторный upsert идемпотентен —
    // он просто находит запись, созданную шагом выше.
    async jwt(params) {
      if (params.account?.provider === 'yandex') {
        const user = await upsertYandexUser(params.profile);
        if (user) {
          params.token.userId = user.id;
          params.token.role = user.role;
        }
        return params.token;
      }
      return authConfig.callbacks.jwt(params);
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(raw): Promise<User | null> {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });
        if (!user || !user.passwordHash || user.blockedAt) return null;

        const ok = await argon2.verify(user.passwordHash, password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role,
        } as User;
      },
    }),
    ...(yandexEnabled
      ? [
          Yandex({
            clientId: process.env.AUTH_YANDEX_ID,
            clientSecret: process.env.AUTH_YANDEX_SECRET,
          }),
        ]
      : []),
  ],
});
