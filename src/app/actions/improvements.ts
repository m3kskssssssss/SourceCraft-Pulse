'use server';

// Pull request с улучшениями на странице анализа своего репозитория.
//
// createImprovementPrAction — PR из подготовленного предложения. Из браузера
// приходят только id выбранных пунктов: содержимое берём из базы, ровно то,
// что владелец видел в превью.
//
// answerPrMergedAction — ответ на вопрос «PR приняли?». «Да» ставит
// репозиторий на переоценку и ведёт в «Мои репозитории», где видно, как она идёт.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { analyses, events, improvementProposals, sourcecraftTokens, users } from '@/db/schema';
import { getImprovementContext, getLatestProposal } from '@/lib/improvements/for-analysis';
import { pullRequestDescription, type ProposalItem } from '@/lib/improvements/proposal';
import { createImprovementPullRequest, PullRequestError } from '@/lib/improvements/pull-request';
import { checkUserLimits } from '@/lib/limits';
import { enqueueOwnerAnalysis } from '@/lib/ownership';
import { decryptToken } from '@/lib/token-crypto';

export type ImprovementPrState = {
  ok: boolean;
  error?: string;
};

/** Не чаще одного PR в две минуты на пользователя — от двойного нажатия и спама. */
const COOLDOWN_MS = 2 * 60 * 1000;

const UUID = /^[0-9a-f-]{36}$/i;

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function createImprovementPrAction(
  _prev: ImprovementPrState | undefined,
  formData: FormData,
): Promise<ImprovementPrState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Требуется вход' };

  const analysisId = String(formData.get('analysisId') ?? '');
  const proposalId = String(formData.get('proposalId') ?? '');
  if (!UUID.test(analysisId) || !UUID.test(proposalId)) return { ok: false, error: 'Некорректный запрос' };

  const ctx = await getImprovementContext(analysisId, userId);
  if (!ctx) return { ok: false, error: 'Предлагать изменения можно только в свой подтверждённый репозиторий.' };
  if (ctx.blocker === 'no_token' || ctx.blocker === 'token_invalid') {
    return { ok: false, error: 'Нужен действующий токен SourceCraft — сохраните его в «Моих репозиториях».' };
  }
  if (ctx.blocker === 'no_branch' || !ctx.defaultBranch) {
    return { ok: false, error: 'Не знаем основную ветку репозитория — оцените его заново.' };
  }

  const proposal = await getLatestProposal(analysisId, userId);
  if (!proposal || proposal.id !== proposalId || proposal.status !== 'ready') {
    return { ok: false, error: 'Предложение устарело — обновите страницу.' };
  }
  const items = (Array.isArray(proposal.items) ? proposal.items : []) as ProposalItem[];
  const keys = new Set(formData.getAll('item').map(String));
  const selected = items.filter((item) => keys.has(item.id));
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
  const hasDocs = selected.some((i) => i.section === 'docs');
  const hasCode = selected.some((i) => i.section === 'code');
  const title =
    selected.length === 1
      ? `Pulse: ${lowerFirst(selected[0]!.title)}`
      : `Pulse: ${hasDocs && hasCode ? 'документация и код' : hasDocs ? 'документация' : 'код'} (${selected.length} изменений)`;

  try {
    const result = await createImprovementPullRequest({
      org: ctx.org,
      repo: ctx.repo,
      defaultBranch: ctx.defaultBranch,
      token,
      // Коммит от имени владельца: это его репозиторий и его токен.
      author: { name: ctx.owner, email: user?.email ?? 'noreply@localhost' },
      changes: selected.map((item) => ({ path: item.path, content: item.content, baseOid: item.baseOid })),
      title,
      description: pullRequestDescription(selected, null),
    });

    const appliedIds = selected.filter((i) => result.appliedPaths.includes(i.path)).map((i) => i.id);
    await db
      .update(improvementProposals)
      .set({
        status: 'submitted',
        prBranch: result.branch,
        prSlug: result.slug,
        prItems: { applied: appliedIds, skipped: result.skipped },
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(improvementProposals.id, proposal.id));
    await db.insert(events).values({
      userId,
      kind: 'improvement.pr_created',
      payload: {
        analysisId,
        proposalId: proposal.id,
        org: ctx.org,
        repo: ctx.repo,
        branch: result.branch,
        slug: result.slug,
        files: result.appliedPaths,
      },
    });
  } catch (err) {
    const message =
      err instanceof PullRequestError ? err.message : err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Не получилось: ${message}` };
  }

  revalidatePath(`/a/${analysisId}`);
  return { ok: true };
}

/**
 * «PR приняли?» — да: ставим репозиторий на переоценку и ведём в «Мои
 * репозитории»; нет: запоминаем ответ, можно готовить новые правки.
 */
export async function answerPrMergedAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  if (!userId) redirect('/signin');
  const analysisId = String(formData.get('analysisId') ?? '');
  const proposalId = String(formData.get('proposalId') ?? '');
  const answer = String(formData.get('answer') ?? '');
  if (!UUID.test(analysisId) || !UUID.test(proposalId) || (answer !== 'yes' && answer !== 'no')) return;

  const ctx = await getImprovementContext(analysisId, userId);
  const proposal = await getLatestProposal(analysisId, userId);
  if (!ctx || !proposal || proposal.id !== proposalId || proposal.status !== 'submitted') return;

  if (answer === 'no') {
    await db
      .update(improvementProposals)
      .set({ mergedAnswer: 'no', updatedAt: new Date() })
      .where(eq(improvementProposals.id, proposal.id));
    revalidatePath(`/a/${analysisId}`);
    return;
  }

  // Уже идёт прогон этого репозитория — переоценкой считаем его.
  const pending = await db.query.analyses.findFirst({
    where: and(eq(analyses.repositoryId, ctx.repositoryId), inArray(analyses.status, ['queued', 'running'])),
  });
  let reevaluationId = pending?.id ?? null;
  if (!reevaluationId) {
    const limitError = await checkUserLimits(userId);
    if (limitError) redirect(`/repos?error=${encodeURIComponent(limitError)}`);
    reevaluationId = await enqueueOwnerAnalysis(db, userId, ctx.repositoryId, 'pr_merged');
  }

  await db
    .update(improvementProposals)
    .set({ mergedAnswer: 'yes', reevaluationId, updatedAt: new Date() })
    .where(eq(improvementProposals.id, proposal.id));
  revalidatePath('/repos');
  revalidatePath(`/a/${analysisId}`);
  redirect('/repos');
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
