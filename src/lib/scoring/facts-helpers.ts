// Небольшие адаптеры между RepoFacts и метриками. Отдельный файл,
// чтобы не тащить в каждую метрику массу деталей collect.

import type { RepoFacts } from '../collect';

/**
 * Проверяет, есть ли в facts.missing хотя бы один тег из переданных.
 * Использование: `if (isUnknown(facts, 'tree_fetch_failed')) return unknown(...);`.
 * Совпадение по префиксу через startsWith, чтобы «tree_fetch_failed:..." тоже ловилось.
 */
export function isUnknown(facts: RepoFacts, ...tags: string[]): boolean {
  for (const item of facts.missing) {
    for (const tag of tags) {
      if (item === tag || item.startsWith(`${tag}:`)) return true;
    }
  }
  return false;
}

/** Число, поделённое на другое число с защитой от нуля и non-finite. */
export function safeShare(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  return numerator / denominator;
}
