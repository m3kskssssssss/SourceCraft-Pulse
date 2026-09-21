// Кэш ответов ИИ по SHA-256 от «task + input».
//
// Две реализации:
//   - InMemoryAiCache: Map, живёт процесс. Для CLI и тестов.
//   - DrizzleAiCache: таблица ai_cache. Обязателен на serverless — там
//     каждый запрос новый процесс, и память ничего не хранит.
//
// Кэшируем JSON-объекты (Zod-парсированный результат конкретной задачи).

import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { aiCache } from '../../db/schema';
import type * as schema from '../../db/schema';

/** Drizzle-клиент с нашей схемой: и приложение, и воркер ходят через pg-драйвер. */
export type AiCacheDb = NodePgDatabase<typeof schema>;

export type AiCacheKey = { task: string; input: unknown };

export interface AiCache {
  hash(key: AiCacheKey): string;
  get<T>(key: AiCacheKey): Promise<T | null>;
  put<T>(key: AiCacheKey, value: T): Promise<void>;
}

/** Стабильный SHA-256 по task + канонический JSON. */
export function hashKey(key: AiCacheKey): string {
  const canonical = stableStringify(key.input);
  return createHash('sha256').update(`${key.task}\n${canonical}`).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((v) => stableStringify(v)).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

// ---------- In-memory ----------

export class InMemoryAiCache implements AiCache {
  private readonly store = new Map<string, unknown>();

  hash(key: AiCacheKey): string {
    return hashKey(key);
  }

  async get<T>(key: AiCacheKey): Promise<T | null> {
    const h = this.hash(key);
    return (this.store.has(h) ? (this.store.get(h) as T) : null);
  }

  async put<T>(key: AiCacheKey, value: T): Promise<void> {
    this.store.set(this.hash(key), value);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

// ---------- Postgres ----------

/**
 * Кэш в таблице ai_cache. Нужен именно на serverless: там каждый запрос —
 * новый процесс, и in-memory кэш не переживает даже соседний вызов задачи.
 * Повторный анализ того же репозитория с теми же фактами не стоит ничего.
 */
export class DrizzleAiCache implements AiCache {
  constructor(
    private readonly db: AiCacheDb,
    private readonly meta: { provider: string; model: string },
  ) {}

  hash(key: AiCacheKey): string {
    return hashKey(key);
  }

  async get<T>(key: AiCacheKey): Promise<T | null> {
    const rows = await this.db
      .select({ response: aiCache.response })
      .from(aiCache)
      .where(eq(aiCache.hash, this.hash(key)))
      .limit(1);
    const row = rows[0];
    return row ? (row.response as T) : null;
  }

  async put<T>(key: AiCacheKey, value: T): Promise<void> {
    await this.db
      .insert(aiCache)
      .values({
        hash: this.hash(key),
        task: key.task,
        provider: this.meta.provider,
        model: this.meta.model,
        response: value as Record<string, unknown>,
      })
      .onConflictDoNothing();
  }
}
