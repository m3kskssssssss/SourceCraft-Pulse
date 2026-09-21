// AI-задача №2: разбор выборки PR и issues.
// Не влияет на итоговую оценку — отчёт для админки/UI.

import { z } from 'zod';
import type { RepoFacts } from '../../collect';
import type { AiCache } from '../cache';
import type { AiProvider } from '../provider';
import type { AiTelemetry } from '../telemetry';
import { runAiTask, type RunAiTaskResult } from '../runner';

const MAX_ITEMS = 24;
const MAX_TEXT_CHARS = 200;

const TASK_KINDS = ['bug', 'feature', 'refactor', 'docs', 'chore', 'question', 'other'] as const;

type TaskKind = (typeof TASK_KINDS)[number];

const taskTypeEntrySchema = z.object({
  kind: z.enum(TASK_KINDS),
  count: z.number().int().nonnegative(),
});

/**
 * Модель на этот вопрос устойчиво отвечает словарём `{"bug": 24}`, а не
 * массивом `[{kind, count}]`. Спорить с ней дороже, чем принять оба вида:
 * словарь нормализуем сами, неизвестные виды складываем в `other`.
 */
const taskTypesSchema = z
  .union([z.array(taskTypeEntrySchema), z.record(z.string(), z.number())])
  .transform(normalizeTaskTypes);

const digestSchema = z.object({
  substantive_discussion_share: z.number().min(0).max(1),
  task_types: taskTypesSchema,
  summary: z.string().max(400),
});

function normalizeTaskTypes(
  raw: Array<{ kind: TaskKind; count: number }> | Record<string, number>,
): Array<{ kind: TaskKind; count: number }> {
  const counts = new Map<TaskKind, number>();
  const add = (kind: string, count: number): void => {
    const known = (TASK_KINDS as readonly string[]).includes(kind) ? (kind as TaskKind) : 'other';
    const value = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
    counts.set(known, (counts.get(known) ?? 0) + value);
  };

  if (Array.isArray(raw)) {
    for (const entry of raw) add(entry.kind, entry.count);
  } else {
    for (const [kind, count] of Object.entries(raw)) add(kind, count);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => ({ kind, count }));
}

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
На входе — выборка PR и issue.
Отвечай ТОЛЬКО валидным JSON без markdown-ограждений. Никаких пояснений вне JSON.

Формат ответа СТРОГО такой:
{
  "substantive_discussion_share": <число от 0 до 1>,
  "task_types": [
    { "kind": "bug", "count": <целое> },
    { "kind": "feature", "count": <целое> }
  ],
  "summary": "<1-2 предложения по-русски, до 300 символов>"
}

Правила:
- substantive_discussion_share: доля записей, где обсуждение по существу
  (не «lgtm», не мелкие замечания код-ревью).
- task_types: массив объектов; kind — одно из bug, feature, refactor, docs,
  chore, question, other. Перечисляй только встретившиеся виды.
- Ответ короткий: перечислять сами записи не нужно.`;

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
    maxTokens: 1200,
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
