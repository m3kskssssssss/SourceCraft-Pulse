// Значения, которыми управляет админка, читаются одним местом.
//
// Нужно это ради формы настроек: после «Сохранить» в полях должно оказаться
// то, что теперь лежит в базе, а не то, что отправил браузер. Экшен
// перечитывает настройки этой же функцией, что и страница, — расхождению
// между «показано» и «сохранено» взяться неоткуда.

import { getNumberSetting, getSetting } from './settings';
import { USER_CONCURRENT_ANALYSIS_LIMIT, USER_DAILY_ANALYSIS_LIMIT } from './limits';

/** Модель по умолчанию, если её не задали ни в БД, ни в окружении. */
export const DEFAULT_AI_MODEL = 'openai/gpt-6-luna-pro';

export type AdminSettingsValues = {
  aiModel: string;
  monthlyBudgetRub: number;
  userDaily: number;
  userConcurrent: number;
};

export async function readAdminSettings(): Promise<AdminSettingsValues> {
  const [aiModel, monthlyBudgetRub, userDaily, userConcurrent] = await Promise.all([
    getSetting<string>('ai.model', process.env.AI_MODEL || DEFAULT_AI_MODEL),
    // Ровно тот же вызов, что и в assertUnderMonthlyBudget: страница обязана
    // показывать лимит, по которому на самом деле рубятся AI-задачи.
    getNumberSetting('ai.monthly_budget_rub', 'AI_MONTHLY_BUDGET_RUB', 0),
    getNumberSetting('limits.user_daily', 'USER_DAILY_ANALYSIS_LIMIT', USER_DAILY_ANALYSIS_LIMIT),
    getNumberSetting(
      'limits.user_concurrent',
      'USER_CONCURRENT_ANALYSIS_LIMIT',
      USER_CONCURRENT_ANALYSIS_LIMIT,
    ),
  ]);

  return {
    aiModel: String(aiModel),
    monthlyBudgetRub,
    userDaily: Math.max(1, Math.floor(userDaily)),
    userConcurrent: Math.max(1, Math.floor(userConcurrent)),
  };
}
