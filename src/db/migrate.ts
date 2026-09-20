// Скрипт применения миграций Drizzle к боевой БД.
// Используется вручную (`pnpm db:migrate`) и из деплой-скрипта.

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

function needsSsl(url: string): boolean {
  return /sslmode=require/i.test(url) || /\.neon\.tech/i.test(url);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL не задан. Задайте его в .env или в окружении процесса.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: needsSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool);

  console.log('Применяем миграции из ./drizzle ...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Миграции применены.');
  await pool.end();
}

main().catch((error: unknown) => {
  console.error('Ошибка при применении миграций:', error);
  process.exit(1);
});
