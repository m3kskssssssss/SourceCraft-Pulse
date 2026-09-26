// Покрытие оценки: какая доля весов измерена, а какая ушла в «нет данных».
//
// Балл нормируется только по измеренному, поэтому сам по себе он не говорит,
// на скольких данных стоит. Покрытие показываем рядом: 74 % — значит, четверть
// весов (обычно AppSec и прогоны CI, закрытые платформой для посторонних)
// в балле не участвовала.
//
// Считается из сохранённых categoryScores, без миграции базы. У старых
// прогонов категорий меньше — знаменатель берём только по тем, что есть.

import { CATEGORY_WEIGHTS } from './config';
import type { CategoryKey } from './types';

type StoredCategory = {
  key?: unknown;
  appliedWeightSum?: unknown;
  metrics?: unknown;
};

/** Доля измеренных весов, 0..1; null — категорий нет. */
export function computeCoverage(raw: unknown): number | null {
  if (!Array.isArray(raw)) return null;
  let measured = 0;
  let total = 0;
  for (const item of raw as StoredCategory[]) {
    const key = item?.key;
    if (typeof key !== 'string' || !(key in CATEGORY_WEIGHTS)) continue;
    const weight = CATEGORY_WEIGHTS[key as CategoryKey];
    const applied = typeof item.appliedWeightSum === 'number' ? item.appliedWeightSum : 0;
    const full = Array.isArray(item.metrics)
      ? (item.metrics as Array<{ weight?: unknown }>).reduce(
          (sum, m) => sum + (typeof m?.weight === 'number' ? m.weight : 0),
          0,
        )
      : 1;
    total += weight;
    measured += weight * (full > 0 ? Math.min(1, applied / full) : 0);
  }
  return total > 0 ? measured / total : null;
}

/** Меньше этого — оценка стоит на слишком малой части данных. */
export const LOW_COVERAGE = 0.5;
