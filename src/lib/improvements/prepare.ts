// Подготовка предложения pull request: шаблоны + правки ИИ, с диффом и
// ожидаемым приростом балла. Результат пишется в improvement_proposals.
//
// Ход дела:
//   1) клон ветки по умолчанию токеном владельца;
//   2) читаем README, манифесты и файлы, которые смотрел ревьюер при оценке;
//   3) две задачи ИИ параллельно — документация и код (lib/ai/tasks/improve-*);
//   4) проверяем каждую правку: путь разрешён, блоки «найти → заменить»
//      сошлись, JSON парсится; не прошедшие отбрасываем с причиной;
//   5) считаем дифф и прирост, сохраняем.
//
// Код приватного репозитория во внешнюю модель не уходит — как и при оценке:
// там предлагаем только шаблоны.

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { improvementProposals, sourcecraftTokens } from '@/db/schema';
import { DrizzleAiCache } from '../ai/cache';
import { getAiProvider } from '../ai/router';
import { DrizzleAiTelemetry } from '../ai/telemetry';
import { runImproveCode, type ImproveCodeOutput } from '../ai/tasks/improve-code';
import { runImproveDocs, type ImproveDocsOutput } from '../ai/tasks/improve-docs';
import { CATEGORY_WEIGHTS } from '../scoring/config';
import type { CategoryKey } from '../scoring/types';
import { getSetting } from '../settings';
import { decryptToken } from '../token-crypto';
import { applySearchReplace, detectEol, insertAfterTitle, isEditablePath, lineDiff, toLf, withEol } from './edits';
import type { ImprovementContext } from './for-analysis';
import type { ImprovementKey } from './plan';
import { round1, type ProposalItem, type ProposalNotes } from './proposal';
import { openWorkspace, readFileAt, withTimeout, type Workspace } from './workspace';

/** Файлы кода для модели: сколько и какого размера. */
const CODE_FILES_MAX = 6;
const CODE_FILE_MAX_CHARS = 24_000;
const CODE_TOTAL_MAX_CHARS = 70_000;
const README_MAX_CHARS = 24_000;
const MANIFEST_MAX_CHARS = 3_000;
const FILE_LIST_MAX = 200;

const MANIFESTS = [
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'setup.py',
  'go.mod',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Makefile',
  'composer.json',
];

/** Шаблоны .gitignore и .editorconfig двигают метрики кода, остальное — документацию. */
const TEMPLATE_SECTION: Record<ImprovementKey, 'docs' | 'code'> = {
  add_readme: 'docs',
  add_license: 'docs',
  add_contributing: 'docs',
  add_changelog: 'docs',
  add_code_of_conduct: 'docs',
  add_gitignore: 'code',
  add_editorconfig: 'code',
};

const TEMPLATE_METRIC: Record<ImprovementKey, string> = {
  add_license: 'docs.license',
  add_readme: 'docs.readme',
  add_gitignore: 'code.gitignore',
  add_editorconfig: 'code.editorconfig',
  add_contributing: 'docs.contributing',
  add_changelog: 'docs.changelog',
  add_code_of_conduct: 'docs.code_of_conduct',
};

export async function prepareProposal(
  ctx: ImprovementContext,
  proposalId: string,
  deadlineAt: number,
  /** Адрес сайта для карточки Pulse в README; null — карточку не ставим. */
  origin: string | null,
): Promise<void> {
  const setStage = (stage: string) =>
    db
      .update(improvementProposals)
      .set({ stage, updatedAt: new Date() })
      .where(eq(improvementProposals.id, proposalId));

  let ws: Workspace | null = null;
  try {
    if (!ctx.defaultBranch) throw new Error('не знаем основную ветку репозитория — оцените его заново');
    const tokenRow = await db.query.sourcecraftTokens.findFirst({
      where: eq(sourcecraftTokens.userId, ctx.userId),
    });
    if (!tokenRow || tokenRow.invalidAt) throw new Error('нужен действующий токен SourceCraft');
    const token = decryptToken(tokenRow.tokenEncrypted);

    await setStage('clone');
    ws = await openWorkspace({ org: ctx.org, repo: ctx.repo, branch: ctx.defaultBranch, token });

    await setStage('read');
    const workspace = ws;
    const templates = (
      await Promise.all(
        ctx.templates.map(async (tpl) => {
          const file = tpl.files[0];
          // Шаблон — только если файла по-прежнему нет.
          if (!file || (await readFileAt(workspace, file.path))) return null;
          return { tpl, file };
        }),
      )
    ).filter((t): t is NonNullable<typeof t> => t !== null);

    const paths = (ctx.facts.tree?.entries ?? [])
      .map((e) => e.path)
      .filter((p): p is string => typeof p === 'string');
    const readmePath = paths.find((p) => /^readme(\.(md|markdown|rst|txt))?$/i.test(p)) ?? null;
    const readmeFile = readmePath ? await readFileAt(ws, readmePath) : null;
    const manifests = await readManifests(ws, paths);
    const codeFiles = ctx.isPrivate ? [] : await readCodeFiles(ws, ctx);

    const notes: ProposalNotes = {
      docs: null,
      code: null,
      rejected: [],
      caps: {
        docs: round1((100 - (ctx.categoryValues.docs ?? 0)) * share(ctx, 'docs')),
        code: round1((100 - (ctx.categoryValues.code ?? 0)) * share(ctx, 'code')),
        total: Math.max(0, 100 - (ctx.score ?? 0)),
      },
    };

    // ---------- ИИ ----------
    let docsOut: ImproveDocsOutput | null = null;
    let codeOut: ImproveCodeOutput | null = null;
    const ai = ctx.isPrivate ? null : await openAi(ctx.analysisId);
    if (ctx.isPrivate) {
      notes.docs = notes.code =
        'Репозиторий приватный: его содержимое во внешнюю модель мы не отправляем, поэтому только шаблоны.';
    } else if (!ai) {
      notes.docs = notes.code = 'Слой ИИ сейчас не настроен — предлагаем только шаблоны.';
    } else {
      await setStage('ai');
      const planned = (section: 'docs' | 'code') =>
        templates
          .filter(({ tpl }) => TEMPLATE_SECTION[tpl.key] === section)
          .map(({ tpl, file }) => ({ path: file.path, title: tpl.title }));
      const budget = Math.max(10_000, deadlineAt - Date.now() - 15_000);
      const aiMetrics = (ctx.metrics.ai ?? {}) as Record<string, unknown>;
      const rubric = valueOf(aiMetrics.readmeRubric) as { score?: number; summary?: string } | null;
      const review = valueOf(aiMetrics.codeReview) as { summary?: string } | null;
      const findings = Array.isArray(aiMetrics.codeFindings)
        ? (aiMetrics.codeFindings as unknown[]).filter((f): f is string => typeof f === 'string')
        : [];

      const [docsResult, codeResult] = await Promise.allSettled([
        withTimeout(
          runImproveDocs({
            ...ai,
            input: {
              orgRepo: `${ctx.org}/${ctx.repo}`,
              description: ctx.facts.repository?.description ?? null,
              language: ctx.facts.language ?? null,
              files: paths.slice(0, FILE_LIST_MAX),
              readme:
                readmePath && readmeFile?.text && readmeFile.text.length <= README_MAX_CHARS
                  ? { path: readmePath, content: toLf(readmeFile.text) }
                  : null,
              manifests,
              rubric:
                typeof rubric?.score === 'number' ? { score: rubric.score, summary: rubric.summary ?? null } : null,
              currentDocsScore: ctx.categoryValues.docs ?? null,
              plannedFiles: planned('docs'),
            },
          }),
          budget,
          'модель не успела за отведённое время',
        ),
        codeFiles.length === 0
          ? Promise.reject(new Error('не нашлось файлов исходников, которые можно показать модели целиком'))
          : withTimeout(
              runImproveCode({
                ...ai,
                input: {
                  orgRepo: `${ctx.org}/${ctx.repo}`,
                  language: ctx.facts.language ?? null,
                  currentCodeScore: ctx.categoryValues.code ?? null,
                  reviewSummary: review?.summary ?? null,
                  findings,
                  measured: measuredOf(ctx),
                  files: codeFiles.map((f) => ({ path: f.path, content: f.content })),
                  otherFiles: paths.filter((p) => !codeFiles.some((f) => f.path === p)).slice(0, FILE_LIST_MAX),
                  manifests,
                  plannedFiles: planned('code'),
                },
              }),
              budget,
              'модель не успела за отведённое время',
            ),
      ]);
      if (docsResult.status === 'fulfilled') docsOut = docsResult.value.value;
      else notes.docs = `ИИ не подготовил правки документации: ${describe(docsResult.reason)}`;
      if (codeResult.status === 'fulfilled') codeOut = codeResult.value.value;
      else notes.code = `ИИ не подготовил правки кода: ${describe(codeResult.reason)}`;
    }

    // ---------- Проверка и сборка ----------
    await setStage('check');
    const items: ProposalItem[] = [];
    const docsShare = share(ctx, 'docs');
    const codeShare = share(ctx, 'code');
    const templatePaths = new Set(templates.map(({ file }) => file.path.toLowerCase()));

    // Документация от ИИ.
    let aiReadme = false;
    for (const [index, change] of (docsOut?.changes ?? []).entries()) {
      const isReadme = /^readme(\.(md|markdown|rst|txt))?$/i.test(change.path.trim());
      // README правим тот, что уже есть, как бы модель ни написала имя.
      const path = isReadme && readmePath ? readmePath : change.path.trim();
      if (!isEditablePath(path) || (!isReadme && !/\.md$/i.test(path)) || templatePaths.has(path.toLowerCase())) {
        notes.rejected.push({ path, reason: 'модель предложила файл, который в документации не правим' });
        continue;
      }
      const existing = await readFileAt(ws, path);
      if (existing && (!isReadme || existing.text === null)) {
        notes.rejected.push({ path, reason: 'файл уже есть — переписывать его целиком не будем' });
        continue;
      }
      const before = existing?.text ?? '';
      const content = withEol(
        ensureNewline(stripTodoMarks(change.content)),
        existing?.text ? detectEol(existing.text) : '\n',
      );
      if (content === before) continue;
      if (isReadme && !existing) aiReadme = true;
      items.push({
        id: `docs-ai-${index}`,
        section: 'docs',
        source: 'ai',
        action: existing ? 'modify' : 'create',
        path,
        title: change.title,
        why: change.why,
        note: 'Текст подготовлен моделью: перечитайте его и поправьте то, что знаете о проекте лучше.',
        baseOid: existing?.oid ?? null,
        content,
        diff: lineDiff(before, content),
        gain: round1(change.category_gain * docsShare),
      });
    }

    // Шаблоны. README от модели лучше шаблонного — шаблон тогда не нужен.
    const estimate = (out: { estimates: Array<{ path: string; category_gain: number }> } | null, path: string) =>
      out?.estimates.find((e) => e.path.toLowerCase() === path.toLowerCase())?.category_gain ?? null;
    const penalties = Array.isArray(ctx.metrics.penalties)
      ? (ctx.metrics.penalties as Array<{ key?: string; amount?: number }>)
      : [];
    for (const { tpl, file } of templates) {
      if (tpl.key === 'add_readme' && aiReadme) continue;
      const section = TEMPLATE_SECTION[tpl.key];
      const rec = ctx.recommendations.find((r) => r.key === TEMPLATE_METRIC[tpl.key]);
      let gain: number | null = rec ? rec.gain : null;
      if (gain === null) {
        const est = estimate(section === 'docs' ? docsOut : codeOut, file.path);
        if (est !== null) gain = est * (section === 'docs' ? docsShare : codeShare);
        // Штраф за отсутствие лицензии снимается целиком.
        if (tpl.key === 'add_license') {
          const penalty = penalties.find((p) => p.key === 'missing_license')?.amount ?? 0;
          gain = (gain ?? 0) + penalty;
        }
      }
      items.push({
        id: `tpl-${tpl.key}`,
        section,
        source: 'template',
        action: 'create',
        path: file.path,
        title: tpl.title,
        why: tpl.why,
        note: tpl.note,
        baseOid: null,
        content: file.content,
        diff: lineDiff('', file.content),
        gain: gain === null ? null : round1(gain),
      });
    }

    // Код от ИИ.
    for (const [index, change] of (codeOut?.changes ?? []).entries()) {
      const path = change.path.trim();
      if (!isEditablePath(path)) {
        notes.rejected.push({ path, reason: 'в этот файл Pulse не пишет (лок-файлы, CI, секреты)' });
        continue;
      }
      const common = {
        id: `code-ai-${index}`,
        section: 'code' as const,
        source: 'ai' as const,
        path,
        title: change.title,
        why: change.why,
        note: 'Правка модели: не проверялась запуском — прогоните сборку и тесты перед слиянием.',
        gain: round1(change.category_gain * codeShare),
      };
      if (change.action === 'modify') {
        const file = codeFiles.find((f) => f.path === path);
        if (!file) {
          notes.rejected.push({ path, reason: 'модель правила файл, которого не видела' });
          continue;
        }
        const applied = applySearchReplace(file.content, change.edits);
        if (!applied.ok) {
          notes.rejected.push({ path, reason: applied.reason });
          continue;
        }
        const content = withEol(applied.content, file.eol);
        if (!validSyntax(path, content)) {
          notes.rejected.push({ path, reason: 'после правки файл не разбирается' });
          continue;
        }
        items.push({
          ...common,
          action: 'modify',
          baseOid: file.oid,
          content,
          diff: lineDiff(file.content, applied.content),
        });
      } else {
        if (items.some((i) => i.path === path) || (await readFileAt(ws, path))) {
          notes.rejected.push({ path, reason: 'такой файл уже есть' });
          continue;
        }
        const content = ensureNewline(toLf(change.content));
        if (!validSyntax(path, content)) {
          notes.rejected.push({ path, reason: 'новый файл не разбирается' });
          continue;
        }
        items.push({ ...common, action: 'create', baseOid: null, content, diff: lineDiff('', content) });
      }
    }

    // Карточка Pulse под заголовком README. У приватного репозитория её нет:
    // оценки не публикуются, картинка была бы битой.
    if (origin && !ctx.isPrivate) {
      addPulseCard(items, {
        origin,
        org: ctx.org,
        repo: ctx.repo,
        readmePath,
        readme: readmeFile?.text ? { oid: readmeFile.oid, text: readmeFile.text } : null,
      });
    }

    // Внутри раздела — сначала то, что сильнее двигает оценку.
    items.sort((a, b) => (a.section === b.section ? (b.gain ?? 0) - (a.gain ?? 0) : a.section === 'docs' ? -1 : 1));

    await db
      .update(improvementProposals)
      .set({
        status: 'ready',
        stage: null,
        baseOid: ws.headOid,
        items: items as unknown as Record<string, unknown>,
        notes: notes as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(improvementProposals.id, proposalId));
  } catch (err) {
    await db
      .update(improvementProposals)
      .set({ status: 'failed', stage: null, error: describe(err).slice(0, 500), updatedAt: new Date() })
      .where(eq(improvementProposals.id, proposalId));
  } finally {
    await ws?.cleanup();
  }
}

// ---------- Карточка Pulse ----------

const README_RE = /^readme(\.(md|markdown))?$/i;

/**
 * Ставит карточку в README из предложения (правка модели или шаблон), а если
 * README в предложение не попал — отдельным пунктом к существующему README.
 * Карточка уже есть в файле — ничего не делаем.
 */
function addPulseCard(
  items: ProposalItem[],
  input: {
    origin: string;
    org: string;
    repo: string;
    readmePath: string | null;
    readme: { oid: string; text: string } | null;
  },
): void {
  const base = input.origin.replace(/\/+$/, '');
  const slug = `${encodeURIComponent(input.org)}/${encodeURIComponent(input.repo)}`;
  const card = `[![Pulse](${base}/api/card/${slug}.svg)](${base}/r/${slug})`;
  const hasCard = (text: string) =>
    text.includes(`/api/card/${slug}`) || text.includes(`/api/badge/${slug}`);

  const item = items.find((i) => i.section === 'docs' && README_RE.test(i.path));
  if (item) {
    if (hasCard(item.content)) return;
    item.content = insertAfterTitle(item.content, card);
    item.diff = lineDiff(item.action === 'modify' ? (input.readme?.text ?? '') : '', item.content);
    item.why = `${item.why} В начало добавлена карточка Pulse с оценкой репозитория.`;
    return;
  }

  if (!input.readme || !input.readmePath || !README_RE.test(input.readmePath) || hasCard(input.readme.text)) return;
  const content = insertAfterTitle(input.readme.text, card);
  items.push({
    id: 'docs-pulse-card',
    section: 'docs',
    source: 'template',
    action: 'modify',
    path: input.readmePath,
    title: 'Добавить карточку Pulse в README',
    why: 'Карточка под заголовком README показывает балл и категории репозитория и обновляется после каждой переоценки.',
    baseOid: input.readme.oid,
    content,
    diff: lineDiff(input.readme.text, content),
    gain: null,
  });
}

// ---------- Чтение ----------

async function readManifests(ws: Workspace, paths: string[]): Promise<Array<{ path: string; excerpt: string }>> {
  const present = MANIFESTS.filter((name) => paths.some((p) => p === name));
  const out: Array<{ path: string; excerpt: string }> = [];
  for (const path of present.slice(0, 4)) {
    const file = await readFileAt(ws, path);
    if (file?.text) out.push({ path, excerpt: file.text.slice(0, MANIFEST_MAX_CHARS) });
  }
  return out;
}

type CodeFile = { path: string; oid: string; content: string; eol: '\n' | '\r\n' };

/**
 * Файлы для правок — те, что читал ревьюер при оценке: к ним относятся его
 * находки. Сначала упомянутые в находках, дальше по порядку выборки. Файл
 * показываем модели целиком, поэтому слишком длинные пропускаем.
 */
async function readCodeFiles(ws: Workspace, ctx: ImprovementContext): Promise<CodeFile[]> {
  const sample = (ctx.facts.code?.sample ?? [])
    .map((s) => s.path)
    .filter((p): p is string => typeof p === 'string' && isEditablePath(p));
  const findingsText = JSON.stringify((ctx.metrics.ai as Record<string, unknown> | undefined)?.codeFindings ?? []);
  const mentioned = (p: string) => findingsText.includes(p) || findingsText.includes(p.split('/').pop()!);
  const ordered = [...sample.filter(mentioned), ...sample.filter((p) => !mentioned(p))];

  const out: CodeFile[] = [];
  let total = 0;
  for (const path of ordered) {
    if (out.length >= CODE_FILES_MAX) break;
    const file = await readFileAt(ws, path);
    if (!file?.text || file.text.length > CODE_FILE_MAX_CHARS) continue;
    if (total + file.text.length > CODE_TOTAL_MAX_CHARS) continue;
    total += file.text.length;
    out.push({ path, oid: file.oid, content: toLf(file.text), eol: detectEol(file.text) });
  }
  return out;
}

// ---------- Мелочи ----------

/** Доля категории в общем балле: вес среди категорий, у которых есть оценка. */
function share(ctx: ImprovementContext, key: CategoryKey): number {
  const known = (Object.keys(CATEGORY_WEIGHTS) as CategoryKey[]).filter(
    (k) => typeof ctx.categoryValues[k] === 'number' || k === key,
  );
  const sum = known.reduce((acc, k) => acc + CATEGORY_WEIGHTS[k], 0);
  return sum > 0 ? CATEGORY_WEIGHTS[key] / sum : 0.25;
}

function measuredOf(ctx: ImprovementContext): Record<string, string | number | boolean | null> {
  const code = (ctx.facts.code ?? {}) as Record<string, unknown>;
  const flags = ctx.facts.tree?.flags ?? {};
  const pick = (v: unknown) => (typeof v === 'number' || typeof v === 'boolean' ? v : null);
  return {
    'файлов исходников': pick(code.sourceFiles),
    'файлов тестов': pick(code.testFiles),
    'медианная длина файла, строк': pick(code.medianFileLines),
    'файлов длиннее 500 строк, %': pick(code.longFileSharePercent),
    'строк-комментариев, %': pick(code.commentSharePercent),
    'TODO на 1000 строк': pick(code.todoPerKiloLines),
    'конфиг линтера': pick(flags.hasLinterConfig),
    'конфиг CI': pick(flags.hasCiConfig),
  };
}

function valueOf(task: unknown): unknown {
  return task && typeof task === 'object' && 'value' in task ? (task as { value: unknown }).value : null;
}

/** Синтаксис проверяем там, где это можно без тяжёлых парсеров. */
function validSyntax(path: string, content: string): boolean {
  if (/\.json$/i.test(path)) {
    try {
      JSON.parse(content);
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Страховка к правилу промпта: модель просят не оставлять пометок TODO, но
 * если оставила — убираем HTML-комментарии с ними и строки из одной пометки.
 */
function stripTodoMarks(text: string): string {
  return toLf(text)
    .replace(/<!--\s*(TODO|FIXME)[\s\S]*?-->/gi, '')
    .split('\n')
    .filter((line) => !/^\s*(>\s*)?[-*]?\s*(TODO|FIXME)\b/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function ensureNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}

async function openAi(analysisId: string) {
  try {
    const model = await getSetting('ai.model', process.env.AI_MODEL ?? '');
    const provider = getAiProvider({ model: model || undefined });
    return {
      provider,
      cache: new DrizzleAiCache(db, { provider: provider.name, model: provider.model }),
      telemetry: new DrizzleAiTelemetry(db, analysisId),
    };
  } catch {
    return null;
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
