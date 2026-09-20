// Универсальные преобразования сырых метрик в 0..100. Все чистые.

/** Ограничивает число в диапазоне. */
export function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Линейная шкала: `value` из диапазона [min, max] отображается в [0, 100].
 * За границами — соответственно 0 и 100.
 */
export function linearScore(value: number, opts: { min: number; max: number }): number {
  const { min, max } = opts;
  if (max === min) return 100;
  const t = (value - min) / (max - min);
  return clamp(t * 100);
}

/**
 * «Обратная» линейная: меньшее значение — лучше.
 * value ≤ best → 100, value ≥ worst → 0.
 */
export function invertedLinearScore(value: number, opts: { best: number; worst: number }): number {
  const { best, worst } = opts;
  if (worst === best) return 100;
  const t = (value - best) / (worst - best);
  return clamp(100 - t * 100);
}

/**
 * Логарифмическая шкала до целевого значения.
 * 0 → 0, target → 100, значения выше target → 100. Плавный рост в начале.
 */
export function logScore(value: number, opts: { target: number }): number {
  const { target } = opts;
  if (value <= 0) return 0;
  if (value >= target) return 100;
  const t = Math.log1p(value) / Math.log1p(target);
  return clamp(t * 100);
}

/** Логическая метрика: true = 100, false = 0. */
export function boolScore(value: boolean): number {
  return value ? 100 : 0;
}

/** Аккуратное округление до 1 знака после запятой. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
