// Кэш ответов ИИ по SHA-256 от «task + input».
//
// Две реализации:
//   - InMemoryAiCache: Map, живёт процесс. Для CLI и тестов.
//   - DrizzleAiCache: пишет/читает таблицу ai_cache. Требует worker-client
//     (только для скрипта воркера); импорт лениво, чтобы модуль ai/cache
//     оставался бэкенд-независимым.
//
// Кэшируем JSON-объекты (Zod-парсированный результат конкретной задачи).

import { createHash } from 'node:crypto';

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
