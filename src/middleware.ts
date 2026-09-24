// Единый Next.js middleware:
//   1) /admin/* (кроме /admin/login) — своя проверка admin-cookie (HMAC).
//      Верификация здесь Edge-совместимая (Web Crypto через lib/admin-session-edge).
//   2) /analyze и /profile — Auth.js JWT-сессия обычного пользователя.
//   3) остальное — пропускаем.

import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/auth.config';
import { verifyAdminSessionEdge } from '@/lib/admin-session-edge';
import { ADMIN_COOKIE_NAME } from '@/lib/admin-session-constants';

const USER_PROTECTED_PREFIXES = ['/analyze', '/profile'];

const { auth } = NextAuth(authConfig);

async function guardAdmin(req: NextRequest): Promise<NextResponse | null> {
  const { pathname, search } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return null;
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) return null;

  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const payload = await verifyAdminSessionEdge(cookie);
  if (payload) return null;

  const url = new URL('/admin/login', req.nextUrl.origin);
  url.searchParams.set('returnTo', pathname + search);
  return NextResponse.redirect(url);
}

export default auth(async (req) => {
  const adminBlock = await guardAdmin(req);
  if (adminBlock) return adminBlock;

  const { pathname } = req.nextUrl;
  const isUserProtected = USER_PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isUserProtected) return NextResponse.next();
  if (req.auth) return NextResponse.next();

  // После входа всегда главная, поэтому адрес возврата не передаём.
  return NextResponse.redirect(new URL('/signin', req.nextUrl.origin));
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon|.*\\.svg).*)'],
};
