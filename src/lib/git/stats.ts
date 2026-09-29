// Агрегаты по истории коммитов. Чистые функции — здесь нет ни сети, ни файлов.
//
// На вход идут коммиты, вычитанные из shallow-клона (см. history.ts).
// Клон обрезан окном в 90 дней, поэтому «всего коммитов» — это число коммитов
// в клоне, а не в репозитории; наружу такое значение не отдаём.

export type CommitRecord = {
  sha: string;
  authorName: string;
  authorEmail: string;
  authorDate: string; // ISO 8601
  subject: string;
};

export type GitStats = {
  commitsLast90Days: number;
  uniqueAuthorsLast90Days: number;
  lastCommitDate: string | null; // ISO
  /**
   * Доля коммитов самого активного автора за окно, 0..100.
   * Считаем по числу коммитов: числа изменённых строк у нас нет — shallow-клон
   * без рабочей копии не даёт diff-статистику, а считать её по каждому коммиту
   * означало бы обход дерева на каждый коммит.
   */
  topAuthorSharePercent: number | null;
};

const WINDOW_DAYS = 90;

/** Считает агрегаты по массиву коммитов относительно момента `now`. */
export function aggregateGitStats(commits: CommitRecord[], now: Date = new Date()): GitStats {
  const cutoff = now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;

  let commitsLast90Days = 0;
  const authorsLast90Days = new Set<string>();
  const commitsByAuthor = new Map<string, number>();
  let lastCommitTs = -Infinity;

  for (const commit of commits) {
    const ts = Date.parse(commit.authorDate);
    if (Number.isNaN(ts)) continue;
    if (ts > lastCommitTs) lastCommitTs = ts;
    if (ts < cutoff) continue;

    const authorKey = commit.authorEmail || commit.authorName || 'unknown';
    commitsLast90Days += 1;
    authorsLast90Days.add(authorKey);
    commitsByAuthor.set(authorKey, (commitsByAuthor.get(authorKey) ?? 0) + 1);
  }

  let topAuthorSharePercent: number | null = null;
  if (commitsLast90Days > 0) {
    const top = Math.max(...commitsByAuthor.values());
    topAuthorSharePercent = Math.round((top / commitsLast90Days) * 1000) / 10;
  }

  return {
    commitsLast90Days,
    uniqueAuthorsLast90Days: authorsLast90Days.size,
    lastCommitDate: lastCommitTs > -Infinity ? new Date(lastCommitTs).toISOString() : null,
    topAuthorSharePercent,
  };
}

/**
 * Пустые коммиты за окно: не слияние, а дерево то же, что у единственного
 * родителя, — файлы не изменились. Так выглядит накрутка активности
 * (`git commit --allow-empty`). Родитель должен быть в том же логе: у
 * коммита на границе shallow-клона сравнить не с чем, и его не считаем.
 * null — деревьев в логе нет (старый формат), сказать нечего.
 */
export function countEmptyCommits(
  commits: Array<{ oid: string; parents: string[]; tree?: string; authorDate: string }>,
  now: Date = new Date(),
): number | null {
  if (commits.length === 0) return 0;
  if (commits.some((c) => !c.tree)) return null;
  const treeByOid = new Map(commits.map((c) => [c.oid, c.tree]));
  const cutoff = now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  let empty = 0;
  for (const c of commits) {
    const ts = Date.parse(c.authorDate);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    if (c.parents.length !== 1) continue;
    const parentTree = treeByOid.get(c.parents[0]!);
    if (parentTree !== undefined && parentTree === c.tree) empty += 1;
  }
  return empty;
}
