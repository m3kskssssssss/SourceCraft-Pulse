// Предложения pull request по конкретному анализу — с проверкой прав.
//
// Блок «Предложить pull request» видит только подтверждённый владелец
// репозитория (owned_repositories, не убранный). Подготовить правки и создать
// PR можно, если у него сохранён действующий токен SourceCraft — клон и PR
// идут от его имени. Страница, маршрут подготовки и действия зовут одну
// функцию, чтобы проверка была одна.

import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  analyses,
  improvementProposals,
  ownedRepositories,
  repositories,
  sourcecraftTokens,
} from '@/db/schema';
import { CATEGORY_WEIGHTS } from '../scoring/config';
import { SourcecraftClient } from '../sourcecraft/client';
import { decryptToken } from '../token-crypto';
import { withTimeout } from './workspace';
import type { CategoryKey } from '../scoring/types';
import { planImprovements, type Improvement } from './plan';

export type ImprovementBlocker = 'no_token' | 'token_invalid' | 'no_branch' | null;

export type AnalysisFacts = {
  repository?: { description?: string | null; web_url?: string } | null;
  language?: string | null;
  defaultBranch?: string | null;
  webUrl?: string | null;
  tree?: {
    entries?: Array<{ path?: string; type?: string }>;
    flags?: Record<string, unknown>;
  };
  code?: {
    sample?: Array<{ path?: string }>;
    [key: string]: unknown;
  };
};

export type ImprovementContext = {
  analysisId: string;
  userId: string;
  repositoryId: string;
  org: string;
  repo: string;
  isPrivate: boolean;
  defaultBranch: string | null;
  webUrl: string | null;
  owner: string;
  blocker: ImprovementBlocker;
  /** Шаблоны недостающих файлов по данным анализа. */
  templates: Improvement[];
  facts: AnalysisFacts;
  /** Сырые поля анализа, нужные подготовке. */
  score: number | null;
  categoryValues: Partial<Record<CategoryKey, number | null>>;
  recommendations: Array<{ key: string; gain: number }>;
  metrics: Record<string, unknown>;
};

export async function getImprovementContext(
  analysisId: string,
  userId: string | null,
): Promise<ImprovementContext | null> {
  if (!userId) return null;
  const analysis = await db.query.analyses.findFirst({ where: eq(analyses.id, analysisId) });
  if (!analysis || analysis.status !== 'done' || analysis.kind === 'material') return null;

  const [owned] = await db
    .select({ repo: repositories })
    .from(ownedRepositories)
    .innerJoin(repositories, eq(ownedRepositories.repositoryId, repositories.id))
    .where(
      and(
        eq(ownedRepositories.userId, userId),
        eq(ownedRepositories.repositoryId, analysis.repositoryId),
        isNotNull(ownedRepositories.verifiedAt),
        isNull(ownedRepositories.removedAt),
      ),
    )
    .limit(1);
  if (!owned) return null;

  const metrics = (analysis.metrics ?? {}) as Record<string, unknown>;
  const facts = (metrics.facts ?? {}) as AnalysisFacts;
  const flags = facts.tree?.flags ?? {};
  const flag = (name: string): boolean => flags[name] === true;
  const paths = (facts.tree?.entries ?? [])
    .map((e) => e.path)
    .filter((p): p is string => typeof p === 'string');

  const token = await db.query.sourcecraftTokens.findFirst({
    where: eq(sourcecraftTokens.userId, userId),
  });
  const ownerName = token?.scDisplayName || token?.scUsername || owned.repo.orgSlug;

  const recommendations = Array.isArray(analysis.recommendations)
    ? (analysis.recommendations as Array<{ key?: unknown; gain?: unknown }>).flatMap((r) =>
        typeof r.key === 'string' && typeof r.gain === 'number' ? [{ key: r.key, gain: r.gain }] : [],
      )
    : [];

  const templates = planImprovements({
    org: owned.repo.orgSlug,
    repo: owned.repo.repoSlug,
    description: facts.repository?.description ?? owned.repo.description ?? null,
    language: facts.language ?? owned.repo.language ?? null,
    paths,
    flags: {
      hasReadme: flag('hasReadme'),
      hasLicense: flag('hasLicense'),
      hasContributing: flag('hasContributing'),
      hasChangelog: flag('hasChangelog'),
      hasGitignore: flag('hasGitignore'),
      hasEditorConfig: flag('hasEditorConfig'),
      hasCodeOfConduct: flag('hasCodeOfConduct'),
    },
    owner: ownerName,
    year: new Date().getFullYear(),
    recommendations,
  });

  const categoryValues: ImprovementContext['categoryValues'] = {};
  if (Array.isArray(analysis.categoryScores)) {
    for (const cat of analysis.categoryScores as Array<{ key?: unknown; value?: unknown }>) {
      if (typeof cat.key === 'string' && cat.key in CATEGORY_WEIGHTS) {
        categoryValues[cat.key as CategoryKey] = typeof cat.value === 'number' ? cat.value : null;
      }
    }
  }

  const defaultBranch = facts.defaultBranch ?? owned.repo.defaultBranch ?? null;
  return {
    analysisId: analysis.id,
    userId,
    repositoryId: owned.repo.id,
    org: owned.repo.orgSlug,
    repo: owned.repo.repoSlug,
    isPrivate: owned.repo.isPrivate,
    defaultBranch,
    webUrl: facts.webUrl ?? facts.repository?.web_url ?? owned.repo.webUrl ?? null,
    owner: ownerName,
    blocker: !token ? 'no_token' : token.invalidAt ? 'token_invalid' : !defaultBranch ? 'no_branch' : null,
    templates,
    facts,
    score: analysis.score,
    categoryValues,
    recommendations,
    metrics,
  };
}

export type ProposalRow = typeof improvementProposals.$inferSelect;

/** Последнее предложение владельца по этому анализу. */
export async function getLatestProposal(analysisId: string, userId: string): Promise<ProposalRow | null> {
  const [row] = await db
    .select()
    .from(improvementProposals)
    .where(and(eq(improvementProposals.analysisId, analysisId), eq(improvementProposals.userId, userId)))
    .orderBy(desc(improvementProposals.createdAt))
    .limit(1);
  return row ?? null;
}

/** Подготовка считается брошенной, если не двигалась дольше этого. */
export const PREPARE_STALE_MS = 6 * 60 * 1000;

export function isPreparing(row: ProposalRow | null): boolean {
  return Boolean(
    row && row.status === 'preparing' && Date.now() - row.updatedAt.getTime() < PREPARE_STALE_MS,
  );
}

/**
 * Статус PR по данным SourceCraft — подсказка к вопросу «PR приняли?».
 * Не узнали за пару секунд — null: вопрос всё равно задаём, решает владелец.
 */
export async function getPullRequestStatus(
  userId: string,
  org: string,
  repo: string,
  slug: string,
): Promise<string | null> {
  const row = await db.query.sourcecraftTokens.findFirst({ where: eq(sourcecraftTokens.userId, userId) });
  if (!row || row.invalidAt) return null;
  try {
    const client = new SourcecraftClient({ token: decryptToken(row.tokenEncrypted) });
    const pr = await withTimeout(client.getPullRequest(org, repo, slug), 3_000);
    return pr.status ?? null;
  } catch {
    return null;
  }
}
