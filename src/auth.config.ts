// Edge-совместимый конфиг Auth.js. Не импортирует Node-only модули
// (argon2, drizzle-клиента) — только объявляет провайдеров и колбэки.
// Полный конфиг с argon2 живёт в src/auth.ts и используется в route handler
// и server actions (Node-runtime). middleware пользуется только этим файлом.

import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/signin',
  },
  // Провайдеры оставляем пустыми: middleware их не вызывает, а полный
  // конфиг переопределит массив в auth.ts.
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id?: string }).id;
        token.role = (user as { role?: 'user' | 'admin' }).role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string | undefined;
        (session.user as { role?: 'user' | 'admin' }).role =
          (token.role as 'user' | 'admin' | undefined) ?? 'user';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
