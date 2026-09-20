// AI-задача №2: разбор выборки PR и issues.
// Не влияет на итоговую оценку — отчёт для админки/UI.

import { z } from 'zod';
import type { RepoFacts } from '../../collect';
import type { AiCache } from '../cache';
import type { AiProvider } from '../provider';
import type { AiTelemetry } from '../telemetry';
import { runAiTask, type RunAiTaskResult } from '../runner';

const MAX_ITEMS = 50;
const MAX_TEXT_CHARS = 500;

const digestSchema = z.object({
  substantive_discussion_share: z.number().min(0).max(1),
  task_types: z.array(
    z.object({
      kind: z.enum(['bug', 'feature', 'refactor', 'docs', 'chore', 'question', 'other']),
      count: z.number().int().nonnegative(),
    }),
  ),
  summary: z.string().max(600),
});

export type PrIssuesDigest = z.infer<typeof digestSchema>;

export type PrIssuesInput = {
  orgRepo: string;
  items: Array<{ kind: 'pr' | 'issue'; title: string; body: string; comments: number }>;
};

export function buildPrIssuesInput(facts: RepoFacts): PrIssuesInput {
  const prs = facts.pullRequests.slice(0, MAX_ITEMS / 2).map((p) => ({
    kind: 'pr' as const,
    title: (p as { title?: string }).title ?? '',
    body: truncate((p as { description?: string }).description ?? '', MAX_TEXT_CHARS),
    comments: 0,
  }));
  const issues = facts.issues.slice(0, MAX_ITEMS - prs.length).map((i) => ({
    kind: 'issue' as const,
    title: (i as { title?: string }).title ?? '',
    body: truncate((i as { description?: string }).description ?? '', MAX_TEXT_CHARS),
    comments: 0,
  }));
  return {
    orgRepo: `${facts.org}/${facts.repo}`,
    items: [...prs, ...issues],
  };
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length <= max ? text : text.slice(0, max) + '…';
}

const SYSTEM = `Ты аналитик open-source-репозиториев.
На входе — выборка PR и issue. Оцени:
- substantive_discussion_share: доля от 0 до 1 записей, где обсуждение по существу (не «lgtm», не только код-ревью-мелочи).
- task_types: как часто встречаются разные виды задач (bug/feature/refactor/docs/chore/question/other).
- summary: 1–3 предложения по-русски, что запомнилось.
Отвечай ТОЛЬКО валидным JSON без markdown-ограждений.`;

function buildPrompt(input: PrIssuesInput): { system: string; user: string; maxTokens?: number } {
  const list = input.items.length
    ? input.items
        .map(
          (it, i) =>
            `${i + 1}. [${it.kind}] ${it.title}\n   тело: ${it.body || '(пусто)'}`,
        )
        .join('\n')
    : '(нет PR и issue)';
  return {
    system: SYSTEM,
    user: `Репозиторий: ${input.orgRepo}\n\nЗаписи:\n${list}`,
    maxTokens: 500,
  };
}

export async function runPrIssuesDigest(args: {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  facts: RepoFacts;
}): Promise<RunAiTaskResult<PrIssuesDigest>> {
  return runAiTask({
    provider: args.provider,
    cache: args.cache,
    telemetry: args.telemetry,
    task: 'pr_issues_digest',
    input: buildPrIssuesInput(args.facts),
    schema: digestSchema,
    buildPrompt,
    fallback: () => null,
  });
}
