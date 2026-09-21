// Лог коммитов клона в одном месте.
//
// Его читают двое: метрики активности (сколько коммитов и авторов за 90 дней)
// и дерево пути создания. Раньше каждый звал `git.log` сам, то есть на
// большом репозитории две тысячи коммитов разбирались дважды. Теперь лог
// читается один раз и передаётся обоим.

import fs from 'node:fs';
import git from 'isomorphic-git';
import type { RepoClone } from './clone';

export type RawCommit = {
  oid: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  /** ISO-дата автора. */
  authorDate: string;
  subject: string;
};

export async function readCloneCommits(repo: RepoClone, limit: number): Promise<RawCommit[]> {
  const log = await git.log({ fs, dir: repo.dir, ref: repo.headOid, depth: limit, cache: repo.cache });
  return log.map((entry) => ({
    oid: entry.oid,
    parents: entry.commit.parent ?? [],
    authorName: entry.commit.author.name,
    authorEmail: entry.commit.author.email,
    // isomorphic-git отдаёт unix-время автора в секундах.
    authorDate: new Date(entry.commit.author.timestamp * 1000).toISOString(),
    subject: (entry.commit.message.split('\n', 1)[0] ?? '').trim(),
  }));
}
