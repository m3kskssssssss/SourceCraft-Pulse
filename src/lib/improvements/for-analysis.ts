// Предложения для pull request по конкретному анализу — с проверкой прав.
//
// Блок «Предложить pull request» видит только подтверждённый владелец
// репозитория (owned_repositories, не убранный). Создать PR можно, если у
// него сохранён действующий токен SourceCraft — PR открывается от его имени.
// Страница и действие зовут одну функцию, чтобы проверка была одна.

import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, ownedRepositories, repositories, sourcecraftTokens } from '@/db/schema';
import { planImprovements, type Improvement } from './plan';

export type AnalysisImprovements = {
  org: string;
  repo: string;
  defaultBranch: string | null;
  webUrl: string | null;
  items: Improvement[];
  /** Почему создать PR нельзя; null — можно. */
  blocker: 'no_token' | 'token_invalid' | 'no_branch' | null;
  owner: string;
};

type Facts = {
  repository?: { description?: string | null; web_url?: string } | null;
  language?: string | null;
  defaultBranch?: string | null;
  webUrl?: string | null;
  tree?: {
    entries?: Array<{ path?: string; type?: string }>;
    flags?: Record<string, unknown>;
  };
};

export async function getAnalysisImprovements(
  analysisId: string,
  userId: string | null,
): Promise<AnalysisImprovements | null> {
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

  const facts = ((analysis.metrics as { facts?: Facts } | null)?.facts ?? {}) as Facts;
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

  const items = planImprovements({
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

  const defaultBranch = facts.defaultBranch ?? owned.repo.defaultBranch ?? null;
  return {
    org: owned.repo.orgSlug,
    repo: owned.repo.repoSlug,
    defaultBranch,
    webUrl: facts.webUrl ?? facts.repository?.web_url ?? owned.repo.webUrl ?? null,
    items,
    owner: ownerName,
    blocker: !token ? 'no_token' : token.invalidAt ? 'token_invalid' : !defaultBranch ? 'no_branch' : null,
  };
}
