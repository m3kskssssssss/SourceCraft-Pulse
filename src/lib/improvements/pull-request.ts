// Создание pull request с улучшениями на SourceCraft.
//
// В API SourceCraft нет эндпоинта «записать файл», поэтому ветку готовим сами
// через isomorphic-git (бинарника git в serverless нет):
//   1) облегчённый клон ветки по умолчанию (lib/improvements/workspace.ts);
//   2) каждую правку кладём в дерево последнего коммита. Новый файл — только
//      если его всё ещё нет; правка существующего — только если файл той же
//      версии, от которой её готовили. Иначе пункт пропускаем и говорим почему;
//   3) коммит в новую ветку pulse/improvements-…, push с токеном пользователя;
//   4) сам PR — POST /repos/{org}/{repo}/pulls тем же токеном, автором
//      становится владелец токена.

import { SourcecraftClient } from '../sourcecraft/client';
import { commitAndPush, openWorkspace, putFile, writeBlob, WorkspaceCloneError } from './workspace';

export class PullRequestError extends Error {
  constructor(
    message: string,
    /** Где сломалось — для текста пользователю. */
    public readonly stage: 'clone' | 'nothing' | 'push' | 'pr',
  ) {
    super(message);
    this.name = 'PullRequestError';
  }
}

export type PrChange = {
  path: string;
  content: string;
  /** Версия файла, от которой готовили правку; null — файл создаётся. */
  baseOid: string | null;
};

export type CreatePrInput = {
  org: string;
  repo: string;
  defaultBranch: string;
  token: string;
  author: { name: string; email: string };
  changes: PrChange[];
  title: string;
  description: string;
};

export type CreatePrResult = {
  branch: string;
  /** Номер PR в SourceCraft. */
  slug: string | null;
  appliedPaths: string[];
  /** Что не легло: файл появился или изменился после подготовки. */
  skipped: Array<{ path: string; reason: string }>;
};

export async function createImprovementPullRequest(input: CreatePrInput): Promise<CreatePrResult> {
  let ws;
  try {
    ws = await openWorkspace({ org: input.org, repo: input.repo, branch: input.defaultBranch, token: input.token });
  } catch (err) {
    throw new PullRequestError(err instanceof WorkspaceCloneError ? err.message : describe(err), 'clone');
  }

  try {
    const appliedPaths: string[] = [];
    const skipped: CreatePrResult['skipped'] = [];
    let tree = ws.headTree;
    for (const change of input.changes) {
      const blob = await writeBlob(ws, change.content);
      const next = await putFile(ws, tree, change.path, blob, change.baseOid);
      if ('conflict' in next) {
        skipped.push({ path: change.path, reason: next.conflict });
      } else {
        tree = next.tree;
        appliedPaths.push(change.path);
      }
    }
    if (appliedPaths.length === 0) {
      throw new PullRequestError(
        'ни одна правка не легла: файлы изменились после подготовки — подготовьте изменения заново',
        'nothing',
      );
    }

    const branch = `pulse/improvements-${stamp(new Date())}`;
    try {
      await commitAndPush(ws, {
        tree,
        branch,
        author: input.author,
        message: `${input.title}\n\nПредложено Pulse: ${appliedPaths.join(', ')}\n`,
      });
    } catch (err) {
      throw new PullRequestError(
        `SourceCraft не принял ветку: ${describe(err)}. Проверьте, что у токена есть право создавать ветки (роль developer или выше).`,
        'push',
      );
    }

    let slug: string | null = null;
    try {
      const client = new SourcecraftClient({ token: input.token });
      const pr = await client.createPullRequest(input.org, input.repo, {
        title: input.title,
        description: input.description,
        source_branch: branch,
        target_branch: input.defaultBranch,
        publish: true,
      });
      slug = pr.slug ?? null;
    } catch (err) {
      throw new PullRequestError(
        `ветка ${branch} отправлена, но PR не создался: ${describe(err)}. Его можно открыть из этой ветки вручную.`,
        'pr',
      );
    }

    return { branch, slug, appliedPaths, skipped };
  } finally {
    await ws.cleanup();
  }
}

function stamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}-${p(date.getUTCHours())}${p(date.getUTCMinutes())}`;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
