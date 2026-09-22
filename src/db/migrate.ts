// Скрипт применения миграций Drizzle к боевой БД.
//
// Запускается вручную (`pnpm db:migrate`) и автоматически перед сборкой
// (`pnpm build`). Причина второго: Vercel миграции сам не применяет, и любой
// деплой с новой колонкой ронял сайт до тех пор, пока кто-нибудь не вспомнит
// про команду — так мы уже получили «column analyses.kind does not exist» на
// живом рейтинге.
//
// С флагом --optional отсутствие DATABASE_URL не ошибка: локальная сборка
// без базы должна работать. Ошибку самих миграций, наоборот, не глотаем — лучше
// упавшая сборка, чем выкатка кода, который не совпадает со схемой.

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
    // Явный запуск без базы — это ошибка, сборка без базы — нет.
    if (process.argv.includes('--optional')) {
      console.log('DATABASE_URL не задан — миграции пропускаем.');
      return;
    }
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
