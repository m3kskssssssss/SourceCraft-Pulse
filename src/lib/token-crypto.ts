// Шифрование личных токенов SourceCraft для хранения в базе.
//
// AES-256-GCM: шифрует и заодно проверяет целостность — подменённая или
// побитая строка не расшифруется, а не превратится в чужой токен.
// Формат: «iv.tag.шифротекст», каждая часть в base64url.
//
// Ключ — TOKEN_ENCRYPTION_KEY (32 байта в base64 или hex; сгенерировать:
// `openssl rand -base64 32`). Если его нет, ключ выводится из AUTH_SECRET —
// чтобы развёртывание не падало из-за новой переменной. Сменили секрет —
// сохранённые токены перестанут расшифровываться, и пользователей попросят
// ввести токен заново.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

export class TokenKeyMissingError extends Error {
  constructor() {
    super('Не задан TOKEN_ENCRYPTION_KEY (или AUTH_SECRET) — хранить токены нечем.');
    this.name = 'TokenKeyMissingError';
  }
}

function encryptionKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (raw) {
    const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY должен быть 32 байта: base64 или 64 hex-символа.');
    }
    return key;
  }
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new TokenKeyMissingError();
  // Свой контекст в хеше: ключ шифрования токенов не совпадает с секретом сессий.
  return createHash('sha256').update(`pulse:sourcecraft-token:${secret}`).digest();
}

export function encryptToken(token: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((b) => b.toString('base64url')).join('.');
}

/** Бросает, если строка побита или ключ сменился. */
export function decryptToken(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Неверный формат зашифрованного токена');
  const [iv, tag, data] = parts.map((p) => Buffer.from(p, 'base64url')) as [Buffer, Buffer, Buffer];
  const decipher = createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
