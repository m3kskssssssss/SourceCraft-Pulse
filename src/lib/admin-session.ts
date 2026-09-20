// Мини-JWT для сессии администратора. Специально не пересекается с Auth.js:
//   - отдельная кука `pulse-admin-session`
//   - формат `payload.b64.sig.b64`, HMAC-SHA256 через AUTH_SECRET
//   - жизнь 2 часа (заложено в exp), проверка постоянная по времени
//
// Никаких сторонних библиотек: iron-session/jsonwebtoken тянуть не хочется,
// нам нужен маленький функционал под конкретное применение.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { ADMIN_SESSION_MAX_AGE_SEC as MAX_AGE } from './admin-session-constants';

export { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_SEC } from './admin-session-constants';

export type AdminSessionPayload = {
  login: string;
  iat: number; // seconds since epoch
  exp: number;
};

function getSecret(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET не задан — админ-сессия недоступна.');
  return Buffer.from(secret, 'utf8');
}

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return Buffer.from(b64, 'base64');
}

/** Подписывает payload и возвращает строку куки. */
export function signAdminSession(
  login: string,
  now: number = Math.floor(Date.now() / 1000),
): string {
  const payload: AdminSessionPayload = {
    login,
    iat: now,
    exp: now + MAX_AGE,
  };
  const payloadStr = base64UrlEncode(JSON.stringify(payload));
  const sig = createHmac('sha256', getSecret()).update(payloadStr).digest();
  return `${payloadStr}.${base64UrlEncode(sig)}`;
}

/** Проверяет строку куки. Возвращает payload либо null (без исключений — надёжнее). */
export function verifyAdminSession(
  cookie: string | undefined | null,
  now: number = Math.floor(Date.now() / 1000),
): AdminSessionPayload | null {
  if (!cookie) return null;
  const parts = cookie.split('.');
  if (parts.length !== 2) return null;
  const [payloadStr, sigStr] = parts as [string, string];

  const expectedSig = createHmac('sha256', getSecret()).update(payloadStr).digest();
  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigStr);
  } catch {
    return null;
  }
  if (providedSig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(providedSig, expectedSig)) return null;

  let payload: AdminSessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadStr).toString('utf8')) as AdminSessionPayload;
  } catch {
    return null;
  }
  if (typeof payload.login !== 'string' || !Number.isFinite(payload.exp)) return null;
  if (payload.exp <= now) return null;
  return payload;
}
