// Общий раннер AI-задачи: bugtet + cache + провайдер + телеметрия + zod-парс + деградация.
//
// Использование внутри модулей tasks/*:
//
//   const result = await runAiTask({
//     provider, cache, telemetry,
//     task: 'readme_rubric',
//     input: { readme, filesList },
//     schema: RubricSchema,
//     buildPrompt(input) { return { system, user }; },
//     fallback: () => ({ heuristicNote: '...' }),
//   });
//
// Результат: `{ value, source: 'cache' | 'model' | 'fallback' }`.

import type { z } from 'zod';
import type { AiCompleteInput, AiProvider } from './provider';
import type { AiCache } from './cache';
import type { AiTelemetry } from './telemetry';
import { assertUnderMonthlyBudget, BudgetExceededError } from './budget';
import { makeAiCallRecord, usdToRub } from './telemetry';

export type RunAiTaskArgs<TInput, TOutput> = {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  /** Ключ задачи; используется в ai_cache.task и ai_calls.task. */
  task: string;
  /** Вход в задачу — попадёт в hash-ключ и в buildPrompt. */
  input: TInput;
  /** Zod-схема ожидаемого ответа. Обязательна. */
  schema: z.ZodType<TOutput>;
  /** Формирует промпты из входа. */
  buildPrompt(input: TInput): { system: string; user: string; maxTokens?: number };
  /**
   * Fallback-значение, если модель упала/не спарсилась/бюджет исчерпан.
   * Возвращает `null` — значит fallback не поддерживается: пробрасываем ошибку.
   */
  fallback?: (reason: string) => TOutput | null;
};

export type RunAiTaskResult<TOutput> = {
  value: TOutput;
  source: 'cache' | 'model' | 'fallback';
  /** Если модель звалась и был кэш-мисс — тут её отчёт. */
  reason?: string;
};

export async function runAiTask<TInput, TOutput>(
  args: RunAiTaskArgs<TInput, TOutput>,
): Promise<RunAiTaskResult<TOutput>> {
  const { provider, cache, telemetry, task, input, schema, buildPrompt, fallback } = args;

  const cacheKey = { task, input } as const;
  const inputHash = cache.hash(cacheKey);

  const cached = await cache.get<TOutput>(cacheKey);
  if (cached !== null) {
    await telemetry.record(
      makeAiCallRecord({
        provider: provider.name,
        model: provider.model,
        task,
        status: 'cached',
        inputHash,
      }),
    );
    return { value: cached, source: 'cache' };
  }

  try {
    await assertUnderMonthlyBudget(telemetry);
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      const reason = err.message;
      await telemetry.record(
        makeAiCallRecord({
          provider: provider.name,
          model: provider.model,
          task,
          status: 'budget_exceeded',
          error: reason,
          inputHash,
        }),
      );
      const value = fallback?.(reason);
      if (value !== undefined && value !== null) return { value, source: 'fallback', reason };
      throw err;
    }
    throw err;
  }

  const { system, user, maxTokens } = buildPrompt(input);
  const call: AiCompleteInput = { system, user, maxTokens, json: true };

  // Одна попытка + один повтор при zod-ошибке разбора.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let result;
    try {
      result = await provider.complete(call);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await telemetry.record(
        makeAiCallRecord({
          provider: provider.name,
          model: provider.model,
          task,
          status: 'error',
          error: reason,
          inputHash,
        }),
      );
      const value = fallback?.(reason);
      if (value !== undefined && value !== null) return { value, source: 'fallback', reason };
      throw err;
    }

    const rawJson = stripCodeFences(result.text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (err) {
      const reason = `json_parse_failed: ${describe(err)}`;
      await telemetry.record(
        makeAiCallRecord({
          provider: provider.name,
          model: provider.model,
          task,
          status: 'error',
          result,
          error: reason,
          inputHash,
        }),
      );
      if (attempt < 2) continue;
      const value = fallback?.(reason);
      if (value !== undefined && value !== null) return { value, source: 'fallback', reason };
      throw new Error(`AI task ${task}: ${reason}`);
    }

    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      const reason = `zod_parse_failed: ${validated.error.message}`;
      await telemetry.record(
        makeAiCallRecord({
          provider: provider.name,
          model: provider.model,
          task,
          status: 'error',
          result,
          error: reason,
          inputHash,
        }),
      );
      if (attempt < 2) continue;
      const value = fallback?.(reason);
      if (value !== undefined && value !== null) return { value, source: 'fallback', reason };
      throw new Error(`AI task ${task}: ${reason}`);
    }

    await cache.put(cacheKey, validated.data);
    await telemetry.record(
      makeAiCallRecord({
        provider: provider.name,
        model: provider.model,
        task,
        status: 'ok',
        result,
        inputHash,
      }),
    );
    return { value: validated.data, source: 'model' };
  }

  throw new Error(`AI task ${task}: retries exhausted`);
}

/** Снимает возможные markdown-обёртки ```json ... ```. */
export function stripCodeFences(text: string): string {
  const t = text.trim();
  if (!t.startsWith('```')) return t;
  // Убираем первую строку с фенсом и последнюю строку, если она '```'
  const lines = t.split('\n');
  lines.shift();
  if (lines.length > 0 && /^```/.test(lines[lines.length - 1]!)) {
    lines.pop();
  }
  return lines.join('\n').trim();
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Экспортируем usdToRub из телеметрии на всякий случай для тестов.
export { usdToRub };
