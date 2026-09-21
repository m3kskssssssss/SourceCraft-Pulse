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

export const CATEGORY_ORDER: CategoryKey[] = ['activity', 'code', 'security', 'docs'];

/** Позиция категории в фиксированном порядке вывода. */
export function categoryOrder(key: CategoryKey | string): number {
  const index = CATEGORY_ORDER.indexOf(key as CategoryKey);
  return index < 0 ? CATEGORY_ORDER.length : index;
}
