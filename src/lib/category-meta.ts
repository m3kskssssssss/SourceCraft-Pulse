// Подписи и акценты четырёх категорий в одном месте: их показывают и главная,
// и страница анализа, и карточка репозитория.
//
// Акцент задаётся классом-обёрткой (см. globals.css): внутри него дети берут
// цвет из `var(--accent)` и сами про категорию ничего не знают.

import type { CategoryKey } from './scoring/types';

export const CATEGORY_TITLES: Record<CategoryKey, string> = {
  activity: 'Активность',
  code: 'Код',
  security: 'Безопасность',
  docs: 'Документация',
};

export const CATEGORY_BLURBS: Record<CategoryKey, string> = {
  activity: 'Как часто пишут код, сколько людей вовлечено, свежий ли проект.',
  code: 'Тесты, структура файлов, читаемость — из чего складывается поддерживаемость.',
  security: 'Уязвимости в зависимостях, lock-файлы, SECURITY.md.',
  docs: 'README, LICENSE, примеры — насколько легко в проект въехать.',
};

export const CATEGORY_ACCENT_CLASS: Record<CategoryKey, string> = {
  activity: 'accent-activity',
  code: 'accent-code',
  security: 'accent-security',
  docs: 'accent-docs',
};

/** Подписи для тесных мест: строка рейтинга, карточка прогона. */
export const CATEGORY_SHORT: Record<CategoryKey, string> = {
  activity: 'Акт',
  code: 'Код',
  security: 'Без',
  docs: 'Док',
};

export const CATEGORY_ORDER: CategoryKey[] = ['activity', 'code', 'security', 'docs'];

/** Баллы по четырём категориям в фиксированном порядке. */
export type CategoryValues = Record<CategoryKey, number | null>;

export const EMPTY_CATEGORY_VALUES: CategoryValues = {
  activity: null,
  code: null,
  security: null,
  docs: null,
};

/**
 * Достаёт баллы категорий из jsonb-поля `analyses.category_scores`.
 * Данные писали мы сами, но в базе это всё равно `unknown` — разбираем
 * бережно и на любой мусор отвечаем «нет данных».
 */
export function pickCategoryValues(raw: unknown): CategoryValues {
  if (!Array.isArray(raw)) return { ...EMPTY_CATEGORY_VALUES };
  const values: CategoryValues = { ...EMPTY_CATEGORY_VALUES };
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const key = (item as { key?: unknown }).key;
    const value = (item as { value?: unknown }).value;
    if (typeof key !== 'string' || !(key in values)) continue;
    values[key as CategoryKey] = typeof value === 'number' ? Math.round(value) : null;
  }
  return values;
}

/** Позиция категории в фиксированном порядке вывода. */
export function categoryOrder(key: CategoryKey | string): number {
  const index = CATEGORY_ORDER.indexOf(key as CategoryKey);
  return index < 0 ? CATEGORY_ORDER.length : index;
}
