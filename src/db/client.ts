// Клиент Drizzle приложения. Работает с любым Postgres по строке подключения:
// Neon (прод на Vercel) или локальный.
//
// Подключение ленивое. Раньше пул создавался при импорте модуля, и `next build`
// падал на шаге сбора данных о страницах: маршруты импортируются без окружения,
// DATABASE_URL там нет. Теперь пул рождается на первом обращении к базе.
//
// Singleton через globalThis, чтобы hot reload в dev не плодил пулы.

import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

declare global {
  var __pulsePgPool: Pool | undefined;
}

export type Db = NodePgDatabase<typeof schema>;

let instance: Db | null = null;

function needsSsl(url: string): boolean {
  return /sslmode=require/i.test(url) || /\.neon\.tech/i.test(url);
}

function create(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL не задан. Проверьте окружение (.env локально, переменные проекта на сервере).',
    );
  }

  const pool =
    globalThis.__pulsePgPool ??
    new Pool({
      connectionString: url,
      ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
      max: 8,
      idleTimeoutMillis: 30_000,
    });
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__pulsePgPool = pool;
  }

  return drizzle(pool, { schema });
}

/**
 * Обёртка над настоящим клиентом: первое обращение к любому свойству создаёт
 * пул. Для вызывающего ничего не меняется — это всё тот же `db.select()`,
 * `db.query.analyses.findFirst()` и так далее.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    if (!instance) instance = create();
    const real = instance as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});

export { schema };
