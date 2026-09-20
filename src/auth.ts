// Node-полный конфиг Auth.js. Используется в API-роуте и server actions,
// где доступны argon2 и Drizzle-клиент. Edge-safe вариант — см. auth.config.ts.

import NextAuth, { type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { z } from 'zod';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { authConfig } from './auth.config';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
  ],
});
