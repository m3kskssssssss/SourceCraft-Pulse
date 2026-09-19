// Чистый парсер вывода `git log --numstat` со специальным разделителем.
// Используется движком оценки на Этапе 3 (там же будут unit-тесты).
//
// Формат вызова git:
//   git log --numstat --pretty=format:%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e
// где %x1f — unit separator (0x1F), %x1e — record separator (0x1E).

export type CommitFile = {
  added: number; // «-» (бинарник) считается за 0
  deleted: number;
  path: string;
};

export type ParsedCommit = {
  sha: string;
  authorName: string;
  authorEmail: string;
  authorDate: string; // ISO 8601
  subject: string;
  files: CommitFile[];
};

/** Разбирает вывод git log в массив коммитов. Пустая строка → []. */
export function parseGitLog(raw: string): ParsedCommit[] {
  if (!raw.trim()) return [];

  const commits: ParsedCommit[] = [];
  // Разделитель записей — 0x1E. Пустые куски пропускаем.
  const chunks = raw.split('\x1e').map((c) => c.trim()).filter(Boolean);

  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    const header = lines[0] ?? '';
    const parts = header.split('\x1f');
    if (parts.length < 5) continue;
    const [sha, authorName, authorEmail, authorDate, subject] = parts as [
      string,
      string,
      string,
      string,
      string,
    ];

    const files: CommitFile[] = [];
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      // формат: <added>\t<deleted>\t<path>
      const [addedStr, deletedStr, ...rest] = line.split('\t');
      if (addedStr === undefined || deletedStr === undefined || rest.length === 0) continue;
      const path = rest.join('\t');
      files.push({
        added: addedStr === '-' ? 0 : Number.parseInt(addedStr, 10) || 0,
        deleted: deletedStr === '-' ? 0 : Number.parseInt(deletedStr, 10) || 0,
        path,
      });
    }

    commits.push({ sha, authorName, authorEmail, authorDate, subject, files });
  }

  return commits;
}

/** Формат `--pretty` для парсера. Экспортируем как константу, чтобы синхронизировать. */
export const GIT_LOG_PRETTY_FORMAT = '%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e';

// ---------- Агрегация ----------

export type GitStats = {
  commitsLast90Days: number;
  uniqueAuthorsLast90Days: number;
  lastCommitDate: string | null; // ISO
  topAuthorSharePercent: number | null; // 0..100 (по сумме added+deleted)
  totalCommits: number;
};

/** Считает агрегаты по массиву коммитов относительно момента `now`. */
export function aggregateGitStats(commits: ParsedCommit[], now: Date = new Date()): GitStats {
  if (commits.length === 0) {
    return {
      commitsLast90Days: 0,
      uniqueAuthorsLast90Days: 0,
      lastCommitDate: null,
      topAuthorSharePercent: null,
      totalCommits: 0,
    };
  }

  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).getTime();
  let commitsLast90Days = 0;
  const authorsLast90Days = new Set<string>();
  const authorLoc = new Map<string, number>();
  let totalLoc = 0;
  let lastCommitTs = -Infinity;

  for (const commit of commits) {
    const ts = Date.parse(commit.authorDate);
    if (!Number.isNaN(ts) && ts > lastCommitTs) lastCommitTs = ts;

    const authorKey = commit.authorEmail || commit.authorName || 'unknown';
    let commitLoc = 0;
    for (const f of commit.files) commitLoc += f.added + f.deleted;
    authorLoc.set(authorKey, (authorLoc.get(authorKey) ?? 0) + commitLoc);
    totalLoc += commitLoc;

    if (!Number.isNaN(ts) && ts >= cutoff) {
      commitsLast90Days += 1;
      authorsLast90Days.add(authorKey);
    }
  }

  let topAuthorSharePercent: number | null = null;
  if (totalLoc > 0) {
    let top = 0;
    for (const value of authorLoc.values()) if (value > top) top = value;
    topAuthorSharePercent = Math.round((top / totalLoc) * 1000) / 10; // 1 знак после запятой
  }

  return {
    commitsLast90Days,
    uniqueAuthorsLast90Days: authorsLast90Days.size,
    lastCommitDate: lastCommitTs > -Infinity ? new Date(lastCommitTs).toISOString() : null,
    topAuthorSharePercent,
    totalCommits: commits.length,
  };
}
