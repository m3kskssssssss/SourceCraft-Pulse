// Проверка месячного лимита расходов на ИИ.
// Читает AI_MONTHLY_BUDGET_RUB из окружения; если не задан — лимита нет.

import type { AiTelemetry } from './telemetry';

export class BudgetExceededError extends Error {
  constructor(public readonly spentRub: number, public readonly limitRub: number) {
    super(
      `AI monthly budget exceeded: ${spentRub.toFixed(2)}₽ ≥ ${limitRub.toFixed(2)}₽`,
    );
    this.name = 'BudgetExceededError';
  }
}

export async function assertUnderMonthlyBudget(telemetry: AiTelemetry): Promise<void> {
  const raw = process.env.AI_MONTHLY_BUDGET_RUB;
  if (!raw) return;
  const limit = Number.parseFloat(raw);
  if (!Number.isFinite(limit) || limit <= 0) return;
  const spent = await telemetry.monthlySpendRub();
  if (spent >= limit) {
    throw new BudgetExceededError(spent, limit);
  }
}
