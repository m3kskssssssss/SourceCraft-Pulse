import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signAdminSession, verifyAdminSession, ADMIN_SESSION_MAX_AGE_SEC } from '../admin-session';

const ORIGINAL = process.env.AUTH_SECRET;

beforeEach(() => {
  process.env.AUTH_SECRET = 'test-secret-that-is-not-used-in-prod-1234567890';
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = ORIGINAL;
});

describe('admin session', () => {
  it('sign/verify возвращает исходный login', () => {
    const now = 1_000;
    const token = signAdminSession('captain', now);
    const payload = verifyAdminSession(token, now + 1);
    expect(payload?.login).toBe('captain');
    expect(payload?.exp).toBe(now + ADMIN_SESSION_MAX_AGE_SEC);
  });

  it('exp: истёкший токен не проходит', () => {
    const now = 1_000;
    const token = signAdminSession('captain', now);
    const future = now + ADMIN_SESSION_MAX_AGE_SEC + 1;
    expect(verifyAdminSession(token, future)).toBeNull();
  });

  it('подделка подписи: null', () => {
    const now = 1_000;
    const token = signAdminSession('captain', now);
    const [payload] = token.split('.');
    const bogus = `${payload}.AAAAAAAA`;
    expect(verifyAdminSession(bogus, now + 1)).toBeNull();
  });

  it('изменение payload инвалидирует подпись', () => {
    const now = 1_000;
    const token = signAdminSession('captain', now);
    const [, sig] = token.split('.');
    // Меняем payload: другой login, старая подпись — не должно пройти.
    const other = signAdminSession('mimic', now);
    const [otherPayload] = other.split('.');
    const tampered = `${otherPayload}.${sig}`;
    expect(verifyAdminSession(tampered, now + 1)).toBeNull();
  });

  it('пустая/невалидная кука: null', () => {
    expect(verifyAdminSession(undefined)).toBeNull();
    expect(verifyAdminSession('')).toBeNull();
    expect(verifyAdminSession('one-part-only')).toBeNull();
  });
});
