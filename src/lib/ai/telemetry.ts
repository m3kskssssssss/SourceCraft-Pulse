// Учёт вызовов ИИ. Каждый вызов, включая кэш-попадания, попадает в телеметрию.
//
// Две реализации:
//   - ConsoleAiTelemetry: печатает в stdout, накапливает in-memory-суммы за месяц.
//     Используется CLI и когда БД недоступна.
//   - DrizzleAiTelemetry: пишет строки в ai_calls (используется воркером).
//     Реализация появится, когда подключим Neon; интерфейс уже готов.

import type { AiCompleteResult } from './provider';

export type AiCallStatus = 'ok' | 'cached' | 'error' | 'budget_exceeded';

export type AiCallRecord = {
  provider: string;
  model: string;
  task: string;
  status: AiCallStatus;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  costRub: number;
  latencyMs: number;
  error?: string;
  /** Хеш входа для сопоставления с ai_cache. */
  inputHash?: string;
};

export interface AiTelemetry {
  record(call: AiCallRecord): Promise<void>;
  /** Сумма затрат за текущий календарный месяц (UTC), в рублях. */
  monthlySpendRub(): Promise<number>;
}

/**
 * Простейшая телеметрия для CLI: пишет в console.log и хранит суммарные
 * расходы за месяц в памяти процесса.
 */
export class ConsoleAiTelemetry implements AiTelemetry {
  private monthKey = getMonthKey(new Date());
  private monthSum = 0;

  async record(call: AiCallRecord): Promise<void> {
    // Смена месяца между запусками CLI — просто сбрасываем.
    const now = getMonthKey(new Date());
    if (now !== this.monthKey) {
      this.monthKey = now;
      this.monthSum = 0;
    }
    this.monthSum += call.costRub;

    const line =
      `[ai] task=${call.task} status=${call.status} ` +
      `tokens=${call.promptTokens}/${call.completionTokens} ` +
      `cost=$${call.costUsd.toFixed(6)} (${call.costRub.toFixed(4)}₽) ` +
      `latency=${call.latencyMs}ms` +
      (call.error ? ` error=${call.error}` : '');
    console.log(line);
  }

  async monthlySpendRub(): Promise<number> {
    return this.monthSum;
  }
}

/** Пересчитывает USD → рубли по константному курсу из окружения. */
export function usdToRub(usd: number): number {
  const rate = Number.parseFloat(process.env.USD_RUB_RATE ?? '95');
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return usd * rate;
}

/** Собирает запись телеметрии из результата провайдера. */
export function makeAiCallRecord(args: {
  provider: string;
  model: string;
  task: string;
  status: AiCallStatus;
  result?: AiCompleteResult;
  error?: string;
  inputHash?: string;
}): AiCallRecord {
  const result = args.result;
  const costUsd = result?.costUsd ?? 0;
  return {
    provider: args.provider,
    model: args.model,
    task: args.task,
    status: args.status,
    promptTokens: result?.promptTokens ?? 0,
    completionTokens: result?.completionTokens ?? 0,
    costUsd,
    costRub: usdToRub(costUsd),
    latencyMs: result?.latencyMs ?? 0,
    error: args.error,
    inputHash: args.inputHash,
  };
}

function getMonthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
