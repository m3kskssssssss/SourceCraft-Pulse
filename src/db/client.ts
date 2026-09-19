// Клиент Drizzle поверх драйвера Neon serverless.
// Используем HTTP-режим, потому что serverless-функции Vercel живут коротко
// и не выигрывают от WebSocket-пула соединений.

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL не задан. Проверьте окружение (.env локально, переменные проекта на Vercel).');
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });

export { schema };
