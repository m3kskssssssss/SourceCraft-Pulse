// Заглушка seed-скрипта. Настоящее наполнение появится на Этапе 3,
// когда движок оценки сможет прогнать реальные репозитории и получить оценки.
// Здесь мы намеренно не хардкодим числа в БД, чтобы не создавать демо-имитацию.

import 'dotenv/config';

async function main(): Promise<void> {
  console.log('Seed-заглушка: настоящий seed появится на Этапе 3.');
  console.log('Тогда команда pnpm db:seed прогонит collect + scoring на пяти реальных репозиториях SourceCraft.');
}

main().catch((error: unknown) => {
  console.error('Ошибка seed:', error);
  process.exit(1);
});
