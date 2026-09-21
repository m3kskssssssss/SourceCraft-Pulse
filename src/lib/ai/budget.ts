// Проверка месячного лимита расходов на ИИ.
//
// Источник значения — настройка `ai.monthly_budget_rub` из админки, а если её
// нет, переменная AI_MONTHLY_BUDGET_RUB. Ноль или пусто означает «без лимита».
// Раньше читалось только окружение, и поле в админке ни на что не влияло.

import { getNumberSetting } from '../settings';
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
  const limit = await getNumberSetting('ai.monthly_budget_rub', 'AI_MONTHLY_BUDGET_RUB', 0);
  if (!Number.isFinite(limit) || limit <= 0) return;
  const spent = await telemetry.monthlySpendRub();
  if (spent >= limit) {
    throw new BudgetExceededError(spent, limit);
  }
}
