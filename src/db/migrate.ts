// Скрипт применения миграций Drizzle к боевой БД.
// Используется вручную (`pnpm db:migrate`) и из деплоя.
// Не импортируется приложением — только запускается как отдельный процесс.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL не задан. Задайте его в .env или в окружении процесса.');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log('Применяем миграции из ./drizzle ...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Миграции применены.');
}

main().catch((error: unknown) => {
  console.error('Ошибка при применении миграций:', error);
  process.exit(1);
});
