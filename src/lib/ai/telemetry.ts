// Учёт вызовов ИИ. Каждый вызов, включая кэш-попадания, попадает в телеметрию.
//
// Две реализации:
//   - ConsoleAiTelemetry: печатает в stdout, накапливает in-memory-суммы за месяц.
//     Используется CLI и когда БД недоступна.
//   - DrizzleAiTelemetry: пишет строки в ai_calls и считает месячный
//     расход запросом к БД. Единственный рабочий вариант для бюджета.

import { gte, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { aiCalls } from '../../db/schema';
import { getSpendResetAt } from '../settings';
import type * as schema from '../../db/schema';
import type { AiCompleteResult } from './provider';

/** Drizzle-клиент с нашей схемой. */
export type AiTelemetryDb = NodePgDatabase<typeof schema>;

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

// ---------- Postgres ----------

/**
 * Пишет каждый вызов в ai_calls и считает месячный расход запросом к БД.
 *
 * In-memory-версия на serverless бесполезна: бюджет, посчитанный в памяти
 * одного вызова функции, всегда равен нулю — лимит просто не работал бы.
 */
export class DrizzleAiTelemetry implements AiTelemetry {
  constructor(
    private readonly db: AiTelemetryDb,
    /** К какому анализу отнести вызовы. null — вне анализа (CLI, ai:ping). */
    private readonly analysisId: string | null = null,
  ) {}

  async record(call: AiCallRecord): Promise<void> {
    try {
      await this.db.insert(aiCalls).values({
        analysisId: this.analysisId,
        provider: call.provider,
        model: call.model,
        task: call.task,
        promptTokens: call.promptTokens,
        completionTokens: call.completionTokens,
        costRub: call.costRub.toFixed(6),
        latencyMs: call.latencyMs,
        status: call.status,
        error: call.error?.slice(0, 500) ?? null,
      });
    } catch (err) {
      // Телеметрия не должна ронять анализ: логируем и идём дальше.
      console.warn('[ai] не удалось записать ai_calls:', describeError(err));
    }
  }

  async monthlySpendRub(): Promise<number> {
    try {
      // Счётчик считается с начала месяца или с момента, когда администратор
      // нажал «обнулить расходы» — смотря что позже.
      const rows = await this.db
        .select({ total: sql<string>`coalesce(sum(${aiCalls.costRub}), 0)::text` })
        .from(aiCalls)
        .where(gte(aiCalls.createdAt, await spendCutoff()));
      return Number.parseFloat(rows[0]?.total ?? '0') || 0;
    } catch (err) {
      // Не смогли прочитать расход — считаем, что лимит не достигнут,
      // иначе сбой БД молча выключил бы весь ИИ.
      console.warn('[ai] не удалось прочитать месячный расход:', describeError(err));
      return 0;
    }
  }
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Начало месяца или момент сброса — что позже. */
export async function spendCutoff(): Promise<Date> {
  const monthStart = startOfUtcMonth(new Date());
  const reset = await getSpendResetAt();
  return reset && reset > monthStart ? reset : monthStart;
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
