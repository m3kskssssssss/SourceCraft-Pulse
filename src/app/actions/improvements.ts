'use server';

// «Создать pull request» на странице анализа своего репозитория.
//
// План изменений собирается заново на сервере по анализу — из браузера
// приходят только ключи выбранных пунктов. Права проверяет
// getAnalysisImprovements: подтверждённый владелец и действующий токен.

import { and, eq, gte } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { events, sourcecraftTokens, users } from '@/db/schema';
import { getAnalysisImprovements } from '@/lib/improvements/for-analysis';
import { pullRequestDescription } from '@/lib/improvements/plan';
import { createImprovementPullRequest, PullRequestError } from '@/lib/improvements/pull-request';
import { decryptToken } from '@/lib/token-crypto';

export type ImprovementPrState = {
  ok: boolean;
  error?: string;
  branch?: string;
  slug?: string | null;
  addedPaths?: string[];
  skippedPaths?: string[];
  repoUrl?: string | null;
};

/** Не чаще одного PR в две минуты на пользователя — от двойного нажатия и спама. */
const COOLDOWN_MS = 2 * 60 * 1000;

export async function createImprovementPrAction(
  _prev: ImprovementPrState | undefined,
  formData: FormData,
): Promise<ImprovementPrState> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  if (!userId) return { ok: false, error: 'Требуется вход' };

  const analysisId = String(formData.get('analysisId') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(analysisId)) return { ok: false, error: 'Некорректный анализ' };

  const plan = await getAnalysisImprovements(analysisId, userId);
  if (!plan) return { ok: false, error: 'Предлагать изменения можно только в свой подтверждённый репозиторий.' };
  if (plan.blocker === 'no_token' || plan.blocker === 'token_invalid') {
    return { ok: false, error: 'Нужен действующий токен SourceCraft — сохраните его в «Моих репозиториях».' };
  }
  if (plan.blocker === 'no_branch' || !plan.defaultBranch) {
    return { ok: false, error: 'Не знаем основную ветку репозитория — оцените его заново.' };
  }

  const keys = new Set(formData.getAll('item').map(String));
  const selected = plan.items.filter((item) => keys.has(item.key));
  if (selected.length === 0) return { ok: false, error: 'Отметьте хотя бы одно изменение.' };

  const recent = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.userId, userId),
        eq(events.kind, 'improvement.pr_created'),
        gte(events.createdAt, new Date(Date.now() - COOLDOWN_MS)),
      ),
    )
    .limit(1);
  if (recent[0]) return { ok: false, error: 'PR только что создан — подождите пару минут перед следующим.' };

  const tokenRow = await db.query.sourcecraftTokens.findFirst({
    where: eq(sourcecraftTokens.userId, userId),
  });
  let token: string;
  try {
    if (!tokenRow) throw new Error('no token');
    token = decryptToken(tokenRow.tokenEncrypted);
  } catch {
    return { ok: false, error: 'Сохранённый токен не читается — вставьте его заново в «Моих репозиториях».' };
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const title =
    selected.length === 1 ? `Pulse: ${lowerFirst(selected[0]!.title)}` : `Pulse: базовые файлы проекта (${selected.length})`;

  try {
    const result = await createImprovementPullRequest({
      org: plan.org,
      repo: plan.repo,
      defaultBranch: plan.defaultBranch,
      token,
      // Коммит от имени владельца: это его репозиторий и его токен.
      author: { name: plan.owner, email: user?.email ?? 'noreply@localhost' },
      files: selected.flatMap((item) => item.files),
      title,
      description: pullRequestDescription(selected, null),
    });

    await db.insert(events).values({
      userId,
      kind: 'improvement.pr_created',
      payload: {
        analysisId,
        org: plan.org,
        repo: plan.repo,
        branch: result.branch,
        slug: result.slug,
        files: result.addedPaths,
      },
    });

    return {
      ok: true,
      branch: result.branch,
      slug: result.slug,
      addedPaths: result.addedPaths,
      skippedPaths: result.skippedPaths,
      repoUrl: plan.webUrl,
    };
  } catch (err) {
    const message =
      err instanceof PullRequestError ? err.message : err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Не получилось: ${message}` };
  }
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
