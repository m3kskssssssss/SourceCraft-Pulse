import { describe, expect, it } from 'vitest';
import { aggregateGitStats, type CommitRecord } from '../stats';

/** Коротко собирает коммит: важны только автор и дата. */
function commit(sha: string, email: string, date: string): CommitRecord {
  return {
    sha,
    authorName: email.split('@')[0] ?? email,
    authorEmail: email,
    authorDate: date,
    subject: `commit ${sha}`,
  };
}

describe('aggregateGitStats', () => {
  const now = new Date('2026-09-20T00:00:00Z');

  it('пустой массив коммитов даёт нули и null', () => {
    const s = aggregateGitStats([], now);
    expect(s.commitsLast90Days).toBe(0);
    expect(s.uniqueAuthorsLast90Days).toBe(0);
    expect(s.lastCommitDate).toBeNull();
    expect(s.topAuthorSharePercent).toBeNull();
  });

  it('считает коммиты и авторов за 90 дней, старьё не берёт', () => {
    const s = aggregateGitStats(
      [
        commit('a', 'a@x', '2026-09-10T00:00:00Z'),
        commit('b', 'b@x', '2026-08-15T00:00:00Z'),
        commit('c', 'c@x', '2025-01-01T00:00:00Z'), // за пределами окна
      ],
      now,
    );
    expect(s.commitsLast90Days).toBe(2);
    expect(s.uniqueAuthorsLast90Days).toBe(2);
  });

  it('дата последнего коммита учитывает и коммиты вне окна', () => {
    const s = aggregateGitStats(
      [commit('a', 'a@x', '2026-09-10T12:34:56Z'), commit('b', 'b@x', '2024-01-01T00:00:00Z')],
      now,
    );
    expect(s.lastCommitDate).toBe('2026-09-10T12:34:56.000Z');
  });

  it('доля топ-автора считается по числу коммитов внутри окна', () => {
    const s = aggregateGitStats(
      [
        commit('1', 'alice@x', '2026-09-01T00:00:00Z'),
        commit('2', 'alice@x', '2026-09-02T00:00:00Z'),
        commit('3', 'alice@x', '2026-09-03T00:00:00Z'),
        commit('4', 'bob@x', '2026-09-04T00:00:00Z'),
      ],
      now,
    );
    // Alice 3 из 4 → 75%
    expect(s.topAuthorSharePercent).toBe(75);
  });

  it('автор без email опознаётся по имени', () => {
    const s = aggregateGitStats(
      [
        { ...commit('1', '', '2026-09-01T00:00:00Z'), authorName: 'Alice', authorEmail: '' },
        { ...commit('2', '', '2026-09-02T00:00:00Z'), authorName: 'Alice', authorEmail: '' },
      ],
      now,
    );
    expect(s.uniqueAuthorsLast90Days).toBe(1);
    expect(s.topAuthorSharePercent).toBe(100);
  });

  it('битые даты игнорируются, а не ломают агрегат', () => {
    const s = aggregateGitStats(
      [commit('a', 'a@x', 'не дата'), commit('b', 'b@x', '2026-09-10T00:00:00Z')],
      now,
    );
    expect(s.commitsLast90Days).toBe(1);
    expect(s.lastCommitDate).toBe('2026-09-10T00:00:00.000Z');
  });
});
