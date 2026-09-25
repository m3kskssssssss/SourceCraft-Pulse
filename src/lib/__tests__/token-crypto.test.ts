import { afterEach, describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, TokenKeyMissingError } from '../token-crypto';

const saved = { key: process.env.TOKEN_ENCRYPTION_KEY, secret: process.env.AUTH_SECRET };

afterEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = saved.key;
  process.env.AUTH_SECRET = saved.secret;
});

describe('token-crypto', () => {
  it('шифрует и расшифровывает; шифротекст каждый раз новый и без токена', () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    const a = encryptToken('pv1_secret');
    const b = encryptToken('pv1_secret');
    expect(a).not.toBe(b);
    expect(a).not.toContain('pv1_secret');
    expect(decryptToken(a)).toBe('pv1_secret');
  });

  it('без TOKEN_ENCRYPTION_KEY берёт ключ из AUTH_SECRET', () => {
    process.env.TOKEN_ENCRYPTION_KEY = '';
    process.env.AUTH_SECRET = 'auth-secret';
    expect(decryptToken(encryptToken('pv1_x'))).toBe('pv1_x');
  });

  it('другой ключ или побитая строка не расшифровываются', () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    const payload = encryptToken('pv1_x');
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 2).toString('base64');
    expect(() => decryptToken(payload)).toThrow();
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    const broken = payload.slice(0, -2) + (payload.endsWith('AA') ? 'BB' : 'AA');
    expect(() => decryptToken(broken)).toThrow();
  });

  it('без ключа и секрета — понятная ошибка', () => {
    process.env.TOKEN_ENCRYPTION_KEY = '';
    process.env.AUTH_SECRET = '';
    expect(() => encryptToken('pv1_x')).toThrow(TokenKeyMissingError);
  });
});
