// AI-задача: что это за репозиторий — программа или полезный материал.
//
// Эвристика (lib/repo-kind.ts) считает признаки: манифест сборки, доля
// текстовых файлов, плотность ссылок в README, слова вроде «awesome» в
// названии. Она дешёвая и работает без ИИ, но пограничные случаи ей не по
// зубам: генератор документации выглядит как документация, а сборник задач
// с решениями — как проект.
//
// Модель видит README, перепись каталогов и вывод эвристики и выносит
// окончательное решение. Для материала её описание заменяет собой ревью кода:
// оценивать подборку ссылок по шкале «тесты, линтер, CI» бессмысленно, а вот
// рассказать, о чём она и кому пригодится, — полезно.

import { z } from 'zod';
import type { AiCache } from '../cache';
import type { AiProvider } from '../provider';
import type { AiTelemetry } from '../telemetry';
import { runAiTask, type RunAiTaskResult } from '../runner';
import type { RepoFacts } from '../../collect';

const kindSchema = z.object({
  kind: z.enum(['project', 'material']),
  /** 2–4 предложения: о чём репозиторий. */
  summary: z.string().max(900),
  /** Чем именно полезен и кому. Для проекта — чем он занимается. */
  topics: z.array(z.string().max(120)).max(6).default([]),
});

export type RepoKindVerdict = z.infer<typeof kindSchema>;

export type RepoKindInput = {
  orgRepo: string;
  description: string | null;
  languages: string[];
  counts: { files: number; codeFiles: number; testFiles: number };
  flags: { manifest: boolean; tests: boolean; ci: boolean; license: boolean };
  /** Что решила эвристика и почему. */
  guess: { kind: string; confidence: number; signals: string[] };
  directories: Array<{ dir: string; files: number; languages: string[] }>;
  readmeHead: string | null;
};

/** Сколько README показываем: начала хватает, чтобы понять жанр. */
const README_CHARS = 2_500;

const SYSTEM = `Ты определяешь жанр репозитория. Есть ровно два варианта:

- "project" — программа: библиотека, приложение, сервис, инструмент, плагин.
  Её собирают, запускают или подключают к другому коду.
- "material" — полезный материал: подборка ссылок, конспект, учебник,
  шпаргалка, набор примеров для чтения, документация, датасет, список
  вопросов к собеседованию. Это читают, а не запускают.

Отвечай ТОЛЬКО валидным JSON без markdown-ограждений:
{"kind": "project" | "material",
 "summary": "<2-4 предложения по-русски>",
 "topics": ["<короткая формулировка>", ...]}

Правила:
- Решай по сути, а не по количеству файлов: у сборника задач с решениями
  кода бывает много, но запускать его никто не собирается, — это материал.
  Генератор документации — это проект, хотя слово «docs» в названии.
- Для material в summary объясни, о чём материал, что внутри и кому он
  пригодится. Для project — чем занимается программа и из чего состоит.
- topics: 3–5 пунктов, каждый — конкретика из репозитория, без общих слов.
- Пиши только то, что видно в данных. Ничего не выдумывай.`;

function buildPrompt(input: RepoKindInput): { system: string; user: string; maxTokens?: number } {
  const census = input.directories
    .slice(0, 25)
    .map((dir) => `${dir.dir} — ${dir.files}${dir.languages.length ? `, ${dir.languages.join('/')}` : ''}`)
    .join('\n');

  const user = [
    `Репозиторий: ${input.orgRepo}`,
    `Описание: ${input.description ?? 'нет'}`,
    `Языки: ${input.languages.length ? input.languages.join(', ') : 'не определены'}`,
    `Файлов в дереве: ${input.counts.files}, из них с кодом: ${input.counts.codeFiles}, тестов: ${input.counts.testFiles}`,
    `Манифест сборки: ${yesNo(input.flags.manifest)}, тесты: ${yesNo(input.flags.tests)}, CI: ${yesNo(
      input.flags.ci,
    )}, лицензия: ${yesNo(input.flags.license)}`,
    `Предварительная догадка: ${input.guess.kind} (${input.guess.signals.join('; ') || 'без признаков'})`,
    '',
    'КАТАЛОГИ:',
    census || '(нет данных)',
    '',
    'НАЧАЛО README:',
    input.readmeHead ?? '(README нет)',
  ].join('\n');

  return { system: SYSTEM, user, maxTokens: 900 };
}

export async function runRepoKind(args: {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  facts: RepoFacts;
}): Promise<RunAiTaskResult<RepoKindVerdict>> {
  const { facts } = args;
  return runAiTask({
    provider: args.provider,
    cache: args.cache,
    telemetry: args.telemetry,
    task: 'repo_kind',
    input: {
      orgRepo: `${facts.org}/${facts.repo}`,
      description: facts.repository?.description ?? null,
      languages: facts.languages.map((l) => l.name),
      counts: {
        files: facts.tree.entriesCount,
        codeFiles: facts.code.sourceFiles,
        testFiles: facts.code.testFiles,
      },
      flags: {
        manifest: facts.tree.flags.hasBuildManifest,
        tests: facts.tree.flags.hasTestsDir,
        ci: facts.tree.flags.hasCiConfig,
        license: facts.tree.flags.hasLicense,
      },
      guess: {
        kind: facts.kind.kind,
        confidence: facts.kind.confidence,
        signals: facts.kind.signals,
      },
      directories: facts.code.directories.map((dir) => ({
        dir: dir.dir,
        files: dir.files,
        languages: dir.languages,
      })),
      readmeHead: facts.readme ? facts.readme.slice(0, README_CHARS) : null,
    } satisfies RepoKindInput,
    schema: kindSchema,
    buildPrompt,
    // Деградация: остаёмся с выводом эвристики.
    fallback: () => null,
  });
}

function yesNo(value: boolean): string {
  return value ? 'есть' : 'нет';
}
