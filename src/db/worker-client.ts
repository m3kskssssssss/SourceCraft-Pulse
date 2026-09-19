// Postgres-клиент для воркера. Используем классический pg-драйвер поверх Neon,
// потому что HTTP-режим Neon не поддерживает multi-statement транзакции и
// `SELECT FOR UPDATE SKIP LOCKED`. На приложении остаётся `neon-http`.
//
// Пул одного процесса; закрывается через shutdownWorkerDb() в конце run().

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

let pool: Pool | null = null;

export function getWorkerDb() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL не задан. Требуется строка подключения к Neon Postgres.');
    }
    pool = new Pool({
      connectionString: url,
      // Neon требует ssl для внешних подключений.
      ssl: { rejectUnauthorized: false },
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
