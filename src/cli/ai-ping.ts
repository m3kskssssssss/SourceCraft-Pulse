// Проверка AI-провайдера: маленький промпт, печать text/tokens/cost,
// повторный вызов с тем же входом должен пойти из кэша (cost=0).
//
// Использование: pnpm ai:ping

import 'dotenv/config';
import { z } from 'zod';
import { getAiProvider } from '../lib/ai/router';
import { InMemoryAiCache } from '../lib/ai/cache';
import { ConsoleAiTelemetry } from '../lib/ai/telemetry';
import { runAiTask } from '../lib/ai/runner';

const outputSchema = z.object({
  greeting: z.string(),
});

const SYSTEM = 'Отвечай ТОЛЬКО валидным JSON без markdown-ограждений.';

async function main(): Promise<void> {
  const provider = getAiProvider();
  const cache = new InMemoryAiCache();
  const telemetry = new ConsoleAiTelemetry();

  console.log(`Провайдер: ${provider.name} model=${provider.model}`);
  console.log('--- Первый вызов (ожидаем ok, cost > 0) ---');
  const first = await runAiTask({
    provider,
    cache,
    telemetry,
    task: 'ai_ping',
    input: { message: 'hello' },
    schema: outputSchema,
    buildPrompt: (input) => ({
      system: SYSTEM,
      user: `Верни JSON вида {"greeting":"..."} с приветствием на русском для «${input.message}».`,
      maxTokens: 100,
    }),
  });
  console.log('Ответ:', JSON.stringify(first.value));
  console.log('Источник:', first.source);

  console.log('\n--- Второй вызов с тем же входом (ожидаем cached, cost=0) ---');
  const second = await runAiTask({
    provider,
    cache,
    telemetry,
    task: 'ai_ping',
    input: { message: 'hello' },
    schema: outputSchema,
    buildPrompt: (input) => ({
      system: SYSTEM,
      user: `Верни JSON вида {"greeting":"..."} с приветствием на русском для «${input.message}».`,
      maxTokens: 100,
    }),
  });
  console.log('Ответ:', JSON.stringify(second.value));
  console.log('Источник:', second.source);

  console.log(`\nИтого расходов за месяц (in-memory): ${(await telemetry.monthlySpendRub()).toFixed(4)}₽`);
}

main().catch((err: unknown) => {
  console.error('Ошибка ai:ping:', err);
  process.exit(1);
});
