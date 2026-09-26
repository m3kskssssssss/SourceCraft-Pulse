// Подписи и акценты шести категорий в одном месте: их показывают и главная,
// и страница анализа, и карточка репозитория.
//
// Акцент задаётся классом-обёрткой (см. globals.css): внутри него дети берут
// цвет из `var(--accent)` и сами про категорию ничего не знают.

import { CATEGORY_WEIGHTS } from './scoring/config';
import type { CategoryKey } from './scoring/types';

export const CATEGORY_TITLES: Record<CategoryKey, string> = {
  security: 'Безопасность',
  code: 'Код',
  activity: 'Активность',
  docs: 'Документация',
  ci: 'CI/CD',
  issues: 'Задачи',
};

export const CATEGORY_BLURBS: Record<CategoryKey, string> = {
  security:
    'Открытые находки SourceCraft AppSec. Видны только участникам репозитория, поэтому в публичном рейтинге — «нет данных».',
  code: 'Тесты, структура файлов, читаемость, фиксация зависимостей — из чего складывается поддерживаемость.',
  activity: 'Как часто пишут код, сколько людей вовлечено, выпускают ли версии.',
  docs: 'README, LICENSE, примеры — насколько легко в проект въехать.',
  ci: 'Есть ли пайплайн, запускает ли он тесты и линтер, проверяет ли pull request.',
  issues: 'Доводят ли задачи до конца, не копятся ли заброшенные, быстро ли за них берутся.',
};

export const CATEGORY_ACCENT_CLASS: Record<CategoryKey, string> = {
  security: 'accent-security',
  code: 'accent-code',
  activity: 'accent-activity',
  docs: 'accent-docs',
  ci: 'accent-ci',
  issues: 'accent-issues',
};

/** Подписи для тесных мест: строка рейтинга, карточка прогона. */
export const CATEGORY_SHORT: Record<CategoryKey, string> = {
  security: 'Без',
  code: 'Код',
  activity: 'Акт',
  docs: 'Док',
  ci: 'CI',
  issues: 'Зад',
};

/** Порядок вывода: как в ТЗ, от самых весомых категорий. */
export const CATEGORY_ORDER: CategoryKey[] = ['security', 'code', 'activity', 'docs', 'ci', 'issues'];

/** Вес категории в итоговом балле, проценты. */
export function categoryWeightPercent(key: CategoryKey): number {
  return Math.round(CATEGORY_WEIGHTS[key] * 100);
}

/** Баллы по шести категориям в фиксированном порядке. */
export type CategoryValues = Record<CategoryKey, number | null>;

export const EMPTY_CATEGORY_VALUES: CategoryValues = {
  security: null,
  code: null,
  activity: null,
  docs: null,
  ci: null,
  issues: null,
};

/**
 * Достаёт баллы категорий из jsonb-поля `analyses.category_scores`.
 * Данные писали мы сами, но в базе это всё равно `unknown` — разбираем
 * бережно и на любой мусор отвечаем «нет данных». У прогонов до перехода на
 * шесть категорий CI/CD и задач нет — они остаются «нет данных».
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
