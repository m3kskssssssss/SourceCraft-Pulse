import { describe, expect, it } from 'vitest';
import {
  aggregateGitStats,
  parseGitLog,
  GIT_LOG_PRETTY_FORMAT,
} from '../log-parser';

// Разделители из git log --pretty=format:%x1f%x1e
const US = '\x1f';
const RS = '\x1e';

/** Собирает сырую строку в формате GIT_LOG_PRETTY_FORMAT + numstat. */
function fakeLog(
  entries: Array<{
    sha: string;
    author: string;
    email: string;
    date: string;
    subject: string;
    files: Array<[number | '-', number | '-', string]>;
  }>,
): string {
  return entries
    .map(
      (e) =>
        [
          e.sha + US + e.author + US + e.email + US + e.date + US + e.subject,
          ...e.files.map(([a, d, p]) => `${a}\t${d}\t${p}`),
        ].join('\n') + RS,
    )
    .join('\n');
}

describe('parseGitLog', () => {
  it('парсит пустой ввод в пустой массив', () => {
    expect(parseGitLog('')).toEqual([]);
    expect(parseGitLog('   \n\n')).toEqual([]);
  });

  it('парсит один коммит с двумя файлами', () => {
    const raw = fakeLog([
      {
        sha: 'abc123',
        author: 'Alice',
        email: 'a@example.com',
        date: '2026-09-01T10:00:00+00:00',
        subject: 'init',
        files: [
          [10, 0, 'src/index.ts'],
          ['-', '-', 'assets/logo.png'],
        ],
      },
    ]);
    const commits = parseGitLog(raw);
    expect(commits).toHaveLength(1);
    expect(commits[0]!.sha).toBe('abc123');
    expect(commits[0]!.authorEmail).toBe('a@example.com');
    expect(commits[0]!.files).toEqual([
      { added: 10, deleted: 0, path: 'src/index.ts' },
      { added: 0, deleted: 0, path: 'assets/logo.png' },
    ]);
  });

  it('формат pretty равен ожидаемому', () => {
    expect(GIT_LOG_PRETTY_FORMAT).toBe('%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e');
  });
});

describe('aggregateGitStats', () => {
  const now = new Date('2026-09-20T00:00:00Z');

  it('пустой массив коммитов даёт нули и null', () => {
    const s = aggregateGitStats([], now);
    expect(s.commitsLast90Days).toBe(0);
    expect(s.uniqueAuthorsLast90Days).toBe(0);
    expect(s.lastCommitDate).toBeNull();
    expect(s.topAuthorSharePercent).toBeNull();
  });

  it('считает коммиты и авторов за 90 дней', () => {
    const commits = parseGitLog(
      fakeLog([
        {
          sha: 'a',
          author: 'A',
          email: 'a@x',
          date: '2026-09-10T00:00:00Z',
          subject: 'x',
          files: [[10, 0, 'x.ts']],
        },
        {
          sha: 'b',
          author: 'B',
          email: 'b@x',
          date: '2026-08-15T00:00:00Z',
          subject: 'y',
          files: [[5, 0, 'y.ts']],
        },
        {
          sha: 'c',
          author: 'C',
          email: 'c@x',
          date: '2025-01-01T00:00:00Z', // за пределами 90 дней
          subject: 'z',
          files: [[100, 0, 'z.ts']],
        },
      ]),
    );
    const s = aggregateGitStats(commits, now);
    expect(s.commitsLast90Days).toBe(2);
    expect(s.uniqueAuthorsLast90Days).toBe(2);
    expect(s.lastCommitDate).toBe('2026-09-10T00:00:00.000Z');
  });

  it('считает долю топ-автора по общему числу LOC', () => {
    const commits = parseGitLog(
      fakeLog([
        {
          sha: '1',
          author: 'Alice',
          email: 'a@x',
          date: '2026-09-01T00:00:00Z',
          subject: 'big',
          files: [[80, 20, 'src/big.ts']],
        },
        {
          sha: '2',
          author: 'Bob',
          email: 'b@x',
          date: '2026-09-02T00:00:00Z',
          subject: 'small',
          files: [[10, 10, 'src/small.ts']],
        },
      ]),
    );
    const s = aggregateGitStats(commits, now);
    // Alice: 100 LOC, Bob: 20 → topShare = 100/120 ≈ 83.3
    expect(s.topAuthorSharePercent).toBeGreaterThan(80);
    expect(s.topAuthorSharePercent).toBeLessThan(85);
  });
});
