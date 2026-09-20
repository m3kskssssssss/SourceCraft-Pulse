// Лимиты пользователей на запуск анализов.
// Значения зафиксированы в константах и проверяются на сервере в actions.
// Если понадобится динамика — переносим в таблицу settings на Этапе 7.

export const USER_DAILY_ANALYSIS_LIMIT = 10;
export const USER_CONCURRENT_ANALYSIS_LIMIT = 3;

export const LIMIT_MESSAGES = {
  daily: `Дневной лимит: ${USER_DAILY_ANALYSIS_LIMIT} анализов. Попробуйте завтра.`,
  concurrent: `У вас уже ${USER_CONCURRENT_ANALYSIS_LIMIT} анализов в очереди. Дождитесь завершения текущих.`,
} as const;
