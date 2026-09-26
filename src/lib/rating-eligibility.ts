// Кто получает место в рейтинге.
//
// Рейтинг сравнивает проекты, а не копии: форк, зеркало чужого проекта, сам
// шаблон или только что созданная из шаблона копия получили бы чужую оценку.
// Страница анализа у них остаётся, балл считается как обычно — места в
// рейтинге нет, и на странице сказано почему.
//
// Признаки берём из карточки SourceCraft (parent, migration_source,
// template_type) и из истории коммитов клона.

import type { RepoFacts } from './collect';

export type RatingExclusion = 'fork' | 'mirror' | 'template' | 'starter_copy';

/**
 * Стартовая копия: вся история — один-два коммита. Так выглядит репозиторий,
 * созданный из шаблона и не тронутый после. Считаем только по полной истории:
 * у shallow-клона старые коммиты просто не скачаны.
 */
const STARTER_MAX_COMMITS = 2;

export function ratingExclusion(facts: RepoFacts): RatingExclusion | null {
  const repo = facts.repository;
  if (repo?.parent) return 'fork';
  if (repo?.migration_source) return 'mirror';
  if (repo?.template_type && repo.template_type !== 'not_a_template') return 'template';
  const graph = facts.gitGraph;
  if (graph.available && !graph.truncated && graph.totalRead > 0 && graph.totalRead <= STARTER_MAX_COMMITS) {
    return 'starter_copy';
  }
  return null;
}

export const RATING_EXCLUSION_LABELS: Record<RatingExclusion, string> = {
  fork: 'Форк другого репозитория — в рейтинге участвует оригинал.',
  mirror: 'Зеркало или импорт чужого проекта — в рейтинге участвует оригинал.',
  template: 'Это шаблон для новых репозиториев, а не проект.',
  starter_copy: 'Вся история — один-два коммита: похоже на свежую копию шаблона. Место в рейтинге появится, когда в репозитории начнётся своя работа.',
};

/** Разбор из jsonb `analyses.metrics.rating.excluded`. */
export function pickRatingExclusion(metrics: unknown): RatingExclusion | null {
  const value = (metrics as { rating?: { excluded?: unknown } } | null)?.rating?.excluded;
  return typeof value === 'string' && value in RATING_EXCLUSION_LABELS ? (value as RatingExclusion) : null;
}
