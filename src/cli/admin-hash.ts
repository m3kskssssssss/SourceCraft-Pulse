// pnpm admin:hash — принимает пароль из stdin (или первого аргумента),
// проверяет требования policy и печатает готовую строку для .env:
//   ADMIN_PASSWORD_HASH=<хеш>
//
// Хеш формата argon2id — используется в authorize админ-логина.

import argon2 from 'argon2';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { checkAdminPasswordPolicy } from '../lib/admin-policy';

async function main(): Promise<void> {
  const fromArg = process.argv[2];
  let password: string;
  if (fromArg && fromArg !== '-') {
    password = fromArg;
  } else {
    const rl = createInterface({ input: stdin, output: stdout });
    password = await rl.question('Введите пароль администратора: ');
    rl.close();
  }

  const policy = checkAdminPasswordPolicy(password);
  if (!policy.ok) {
    console.error(`Пароль не проходит проверку: ${policy.reason}`);
    process.exit(2);
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });
  console.log('');
  console.log('Скопируйте это в .env (одной строкой):');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
}

main().catch((err: unknown) => {
  console.error('Ошибка admin:hash:', err);
  process.exit(1);
});
