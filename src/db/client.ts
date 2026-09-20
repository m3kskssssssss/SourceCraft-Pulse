// Клиент Drizzle приложения. Работает с любым Postgres по строке подключения:
// локальный (для self-hosted) или удалённый с SSL.
//
// Singleton через globalThis, чтобы hot reload в dev не плодил пулы.

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

declare global {
  var __pulsePgPool: Pool | undefined;
}

function needsSsl(url: string): boolean {
  return /sslmode=require/i.test(url) || /\.neon\.tech/i.test(url);
}

function makePool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL не задан. Проверьте окружение (.env локально, переменные проекта на сервере).',
    );
  }
  return new Pool({
    connectionString: url,
    ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
    max: 8,
    idleTimeoutMillis: 30_000,
  });
}

const pool = globalThis.__pulsePgPool ?? makePool();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__pulsePgPool = pool;
}

export const db = drizzle(pool, { schema });

export { schema };
