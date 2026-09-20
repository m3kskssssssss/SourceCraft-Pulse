// Auth.js middleware, работает в Edge-рантайме.
// Использует Edge-совместимый authConfig (без argon2 и без Drizzle-клиента).
//
// Публичные пути пропускаем всех; /analyze требует сессии.

import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';

const PROTECTED_PREFIXES = ['/analyze'];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();
  if (req.auth) return NextResponse.next();

  const url = new URL('/signin', req.nextUrl.origin);
  url.searchParams.set('returnTo', pathname + search);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon|.*\\.svg).*)'],
};
