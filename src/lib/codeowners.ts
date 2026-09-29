// CODEOWNERS: закреплены ли за частями кода ответственные.
//
// Определяется по дереву файлов, которое уже лежит в фактах анализа, —
// поэтому работает и для старых оценок без перезапуска. В балл не входит:
// показывается в отчёте рядом с документацией как признак зрелого проекта
// (ТЗ, раздел 3.1).

import type { RepoFacts } from './collect';

/** Где ищем файл: корень и каталоги, которые принято использовать для него. */
const CODEOWNERS_PATHS = [
  'codeowners',
  '.github/codeowners',
  '.gitlab/codeowners',
  '.sourcecraft/codeowners',
  'docs/codeowners',
];

/** Сколько записей дерева сохраняется в фактах: дальше дерево обрезано. */
const TREE_LIMIT = 5000;

export type CodeownersStatus =
  | { status: 'present'; path: string }
  | { status: 'absent' }
  /** Дерево не получено или обрезано, а в полученной части файла нет. */
  | { status: 'unknown'; reason: 'tree_unavailable' | 'tree_truncated' };

export function codeownersStatus(facts: Pick<RepoFacts, 'tree' | 'missing'>): CodeownersStatus {
  const treeFailed = (facts.missing ?? []).some((m) => m === 'tree_fetch_failed' || m.startsWith('tree_fetch_failed:'));
  const entries = Array.isArray(facts.tree?.entries) ? facts.tree.entries : [];
  if (treeFailed || entries.length === 0) {
    return treeFailed ? { status: 'unknown', reason: 'tree_unavailable' } : { status: 'absent' };
  }
  for (const entry of entries as Array<{ path?: string; name?: string }>) {
    const path = entry.path ?? entry.name ?? '';
    if (CODEOWNERS_PATHS.includes(path.toLowerCase())) return { status: 'present', path };
  }
  return entries.length >= TREE_LIMIT ? { status: 'unknown', reason: 'tree_truncated' } : { status: 'absent' };
}
