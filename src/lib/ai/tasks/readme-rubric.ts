// AI-задача №1: оценка документации по рубрике.
//
// Заменяет собой всю категорию `docs` в scoreRepo. Если задача упала —
// scoreRepo продолжает работать с heuristic-метриками docs как раньше.

import { z } from 'zod';
import type { RepoFacts } from '../../collect';
import type { AiCache } from '../cache';
import type { AiProvider } from '../provider';
import type { AiTelemetry } from '../telemetry';
import { runAiTask, type RunAiTaskResult } from '../runner';

const READ_ME_MAX_CHARS = 12_000;
const FILES_LIST_MAX = 150;

const rubricSchema = z.object({
  score: z.number().min(0).max(100),
  criteria: z.object({
    structure: z.number().min(0).max(100),
    installation: z.number().min(0).max(100),
    usage: z.number().min(0).max(100),
    api_or_reference: z.number().min(0).max(100),
    supporting_docs: z.number().min(0).max(100),
  }),
  summary: z.string().max(600),
});

export type DocsRubricScore = z.infer<typeof rubricSchema>;

export type ReadmeRubricInput = {
  readme: string | null;
  filesList: string[];
  /** Слаг репозитория для контекста, чтобы модель понимала о чём речь. */
  orgRepo: string;
};

export function buildReadmeRubricInput(facts: RepoFacts): ReadmeRubricInput {
  return {
    orgRepo: `${facts.org}/${facts.repo}`,
    readme: facts.readme ? facts.readme.slice(0, READ_ME_MAX_CHARS) : null,
    filesList: (facts.tree.entries.slice(0, FILES_LIST_MAX) as Array<{ path?: string; name?: string }>)
      .map((e) => e.path ?? e.name ?? '')
      .filter(Boolean),
  };
}

const SYSTEM = `Ты — суровый, но справедливый рецензент документации open-source-репозиториев.
Отвечай ТОЛЬКО валидным JSON без markdown-ограждений. Никаких пояснений вне JSON.

Формат ответа СТРОГО такой (все criteria.* — целые числа от 0 до 100, НЕ вложенные объекты):
{
  "score": <число 0..100>,
  "criteria": {
    "structure": <число 0..100>,
    "installation": <число 0..100>,
    "usage": <число 0..100>,
    "api_or_reference": <число 0..100>,
    "supporting_docs": <число 0..100>
  },
  "summary": "<1-2 предложения по-русски>"
}

Оценивай:
- score: взвешенный итог по документации (README — главный источник).
- criteria.structure: разбит ли README на разделы, есть ли содержание.
- criteria.installation: есть ли явные шаги установки/setup.
- criteria.usage: есть ли примеры использования / quick start.
- criteria.api_or_reference: описан ли публичный API/CLI/конфигурация.
- criteria.supporting_docs: наличие LICENSE, CONTRIBUTING, CHANGELOG, examples/, docs/.`;

function buildPrompt(input: ReadmeRubricInput): { system: string; user: string; maxTokens?: number } {
  const readme = input.readme ?? '(README отсутствует)';
  const files = input.filesList.join(', ') || '(файлы неизвестны)';
  const user = [
    `Репозиторий: ${input.orgRepo}`,
    '',
    'СПИСОК ФАЙЛОВ (первые):',
    files,
    '',
    'СОДЕРЖИМОЕ README:',
    readme,
  ].join('\n');
  return { system: SYSTEM, user, maxTokens: 700 };
}

export async function runReadmeRubric(args: {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  facts: RepoFacts;
}): Promise<RunAiTaskResult<DocsRubricScore>> {
  return runAiTask({
    provider: args.provider,
    cache: args.cache,
    telemetry: args.telemetry,
    task: 'readme_rubric',
    input: buildReadmeRubricInput(args.facts),
    schema: rubricSchema,
    buildPrompt,
    fallback: () => null, // деградация — молча возвращаем null, scoreRepo сам применит heuristic docs
  });
}
