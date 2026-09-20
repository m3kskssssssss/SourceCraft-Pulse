// Edge-совместимая версия verifyAdminSession (использует Web Crypto).
// Node-версия (для server actions и страниц) живёт в admin-session.ts.

export type AdminSessionPayloadEdge = {
  login: string;
  iat: number;
  exp: number;
};

function base64UrlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

export async function verifyAdminSessionEdge(
  cookie: string | undefined | null,
  now: number = Math.floor(Date.now() / 1000),
): Promise<AdminSessionPayloadEdge | null> {
  if (!cookie) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const parts = cookie.split('.');
  if (parts.length !== 2) return null;
  const [payloadStr, sigStr] = parts as [string, string];

  let signature: Uint8Array;
  try {
    signature = base64UrlToBytes(sigStr);
  } catch {
    return null;
  }
  const key = await importKey(secret);
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    signature.buffer.slice(signature.byteOffset, signature.byteOffset + signature.byteLength) as ArrayBuffer,
    new TextEncoder().encode(payloadStr) as unknown as ArrayBuffer,
  );
  if (!ok) return null;

  let payload: AdminSessionPayloadEdge;
  try {
    const bytes = base64UrlToBytes(payloadStr);
    const json = new TextDecoder().decode(bytes);
    payload = JSON.parse(json) as AdminSessionPayloadEdge;
  } catch {
    return null;
  }
  if (typeof payload.login !== 'string' || !Number.isFinite(payload.exp)) return null;
  if (payload.exp <= now) return null;
  return payload;
}
