// Postgres-клиент воркера. Всегда pg-драйвер: нужны multi-statement транзакции
// и SELECT ... FOR UPDATE SKIP LOCKED. SSL включаем по URL (Neon и явный sslmode).
//
// Пул одного процесса; закрывается через shutdownWorkerDb() в конце run().

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

let pool: Pool | null = null;

function needsSsl(url: string): boolean {
  return /sslmode=require/i.test(url) || /\.neon\.tech/i.test(url);
}

export function getWorkerDb() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL не задан. Требуется строка подключения к Postgres.');
    }
    pool = new Pool({
      connectionString: url,
      ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
      // Воркер живёт коротко; ставим маленький пул.
      max: 4,
      idleTimeoutMillis: 10_000,
    });
  }
  return drizzle(pool, { schema });
}

/** Возвращает голый Pool для случаев, где нужен низкоуровневый доступ. */
export function getWorkerPool(): Pool {
  if (!pool) {
    // Ленивая инициализация через getWorkerDb, чтобы читать env в одном месте.
    getWorkerDb();
  }
  return pool!;
}

/** Закрывает пул. Обязательно вызвать в конце процесса воркера. */
export async function shutdownWorkerDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
