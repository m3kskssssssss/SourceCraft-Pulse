// Окна проверки новых коммитов: 00:00 и 12:00 по Москве.
//
// Отдельно от lib/commit-check, чтобы страницам не тянуть за собой конвейер
// анализа ради одной даты.

/** Москва без перехода на летнее время: UTC+3 круглый год. */
const MSK_OFFSET_MS = 3 * 3600 * 1000;
export const SLOT_MS = 12 * 3600 * 1000;

/** Начало текущего окна: последние 00:00 или 12:00 по Москве не позже `now`. */
export function currentSlotStart(now: Date = new Date()): Date {
  const shifted = now.getTime() + MSK_OFFSET_MS;
  return new Date(Math.floor(shifted / SLOT_MS) * SLOT_MS - MSK_OFFSET_MS);
}

/** Следующая плановая проверка. */
export function nextSlotStart(now: Date = new Date()): Date {
  return new Date(currentSlotStart(now).getTime() + SLOT_MS);
}
