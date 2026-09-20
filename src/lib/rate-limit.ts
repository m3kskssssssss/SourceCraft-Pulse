// Простой in-memory rate-limiter по ключу (обычно — IP).
// На Vercel serverless контейнеры недолговечны, поэтому это лимитер
// «best effort»: защита от массового скана, а не жёсткая гарантия.
// Полноценный лимитер требует KV/Redis и появится вне рамок хакатона.

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
};

/**
 * Возвращает {allowed, remaining, resetInMs}. Лимит N запросов за windowMs.
 * Отдельная точка хранения на процесс; на Vercel это подходит для маленьких
 * публичных API, где важно не пустить бота на тысячу запросов в секунду.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    store.set(key, fresh);
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetInMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, resetInMs: bucket.resetAt - now };
}

/** Только для тестов — очищает in-memory состояние. */
export function resetRateLimitForTesting(): void {
  store.clear();
}

/** Извлекает клиентский IP из запроса (best-effort). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
