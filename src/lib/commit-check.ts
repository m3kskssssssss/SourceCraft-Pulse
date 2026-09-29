// Проверка новых коммитов — дважды в сутки, в 00:00 и 12:00 по Москве.
//
// По каждому оценённому репозиторию берём оценку, которая сейчас «его» (сначала
// публичную, иначе последнюю готовую), и сверяем верхушку ветки по умолчанию
// с коммитом, на котором эта оценка считалась:
//   - совпало — пишем в commit_checks строку «без изменений»: оценка та же,
//     в истории появляется отметка, что её подтвердили;
//   - нет — строку «изменился» и новый прогон, который по завершении сменит
//     прежнюю оценку (lib/analysis/run снимает старую с публикации сам).
//
// Верхушку узнаём одним запросом к git-серверу (isomorphic-git
// listServerRefs) — без клона и без лимита REST API. Коммит оценки лежит в
// фактах: `facts.headSha` (HEAD клона), а у старых прогонов — хэш ветки по
// умолчанию из списка веток, собранного тогда же.
//
// Проверка идёт «окнами»: окно — 12 часов от ближайших 00:00/12:00 МСК.
// Репозиторий, уже проверенный в текущем окне, повторно не берётся, поэтому
// вызов по расписанию, не успевший всё за 300 с, спокойно добирается
// следующим. Кнопка в админке сдвигает начало окна на «сейчас».

import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import * as schema from '../db/schema';
import { analyses, analysisJobs, commitChecks, settings } from '../db/schema';
import { currentSlotStart, nextSlotStart } from './commit-slots';

export { currentSlotStart, nextSlotStart };

type Db = NodePgDatabase<typeof schema>;

export type CheckOutcome = 'unchanged' | 'changed' | 'error';
export type CheckTrigger = 'schedule' | 'admin';

/** Сколько репозиториев сверяем одновременно: это лёгкие запросы к git-серверу. */
const CHECK_CONCURRENCY = 8;
const REMOTE_TIMEOUT_MS = 15_000;
/** Сколько переоценок идёт одновременно — как у прогона каталога. */
export const REANALYSIS_CONCURRENCY = 3;
/** Повтор MAX_ATTEMPTS из lib/analysis/run. */
const MAX_ATTEMPTS = 3;

const LAST_RUN_KEY = 'commits.lastRun';
const FORCE_SINCE_KEY = 'commits.forceSince';

// ---------- Верхушка ветки ----------

/**
 * Коммит, на который смотрит HEAD удалённого репозитория (ветка по умолчанию).
 * Протокол v1: сервер отдаёт все ссылки одним ответом, HEAD — среди них.
 */
export async function readRemoteHead(cloneUrl: string, token?: string): Promise<string | null> {
  const refs = await withTimeout(
    git.listServerRefs({
      http,
      url: normalizeCloneUrl(cloneUrl),
      protocolVersion: 1,
      prefix: 'HEAD',
      symrefs: true,
      onAuth: token ? () => ({ username: 'x-access-token', password: token }) : undefined,
    }),
    REMOTE_TIMEOUT_MS,
    'remote_timeout',
  );
  const head = refs.find((r) => r.ref === 'HEAD');
  return head?.oid ?? null;
}

// ---------- Кого проверять ----------

type DueRow = {
  analysis_id: string;
  repository_id: string;
  org_slug: string;
  repo_slug: string;
  clone_url: string | null;
  is_private: boolean;
  is_public: boolean;
  requested_by: string | null;
  baseline_sha: string | null;
};

/**
 * Оценки, которые пора сверить: по одной на репозиторий (публичная, иначе
 * последняя готовая), досчитанные до начала окна и не проверенные в нём.
 * Репозиторий, по которому уже идёт прогон, пропускаем: свежая оценка и так
 * будет на последнем коммите.
 */
async function dueForCheck(db: Db, since: Date, limit: number): Promise<DueRow[]> {
  const result = await db.execute<DueRow>(sql`
    with current as (
      select distinct on (a.repository_id)
        a.id, a.repository_id, a.is_public, a.requested_by, a.finished_at, a.metrics
      from analyses a
      where a.status = 'done'
      order by a.repository_id, a.is_public desc, a.finished_at desc nulls last
    )
    select
      c.id as analysis_id,
      r.id as repository_id,
      r.org_slug, r.repo_slug, r.clone_url, r.is_private,
      c.is_public, c.requested_by,
      coalesce(
        (select k.head_sha from commit_checks k
          where k.analysis_id = c.id and k.outcome = 'unchanged' and k.head_sha is not null
          order by k.checked_at desc limit 1),
        c.metrics -> 'facts' ->> 'headSha',
        (select b -> 'commit' ->> 'hash'
          from jsonb_array_elements(
            case when jsonb_typeof(c.metrics -> 'facts' -> 'branches') = 'array'
              then c.metrics -> 'facts' -> 'branches' else '[]'::jsonb end
          ) b
          where b ->> 'name' = c.metrics -> 'facts' ->> 'defaultBranch'
          limit 1)
      ) as baseline_sha
    from current c
    join repositories r on r.id = c.repository_id
    where c.finished_at < ${since}
      and not exists (
        select 1 from commit_checks k
        where k.repository_id = r.id and k.checked_at >= ${since}
      )
      and not exists (
        select 1 from analyses q
        where q.repository_id = r.id and q.status in ('queued', 'running')
      )
    order by c.finished_at asc
    limit ${limit}
  `);
  return result.rows;
}

/** Сколько репозиториев ещё ждут сверки в текущем окне. */
async function countDue(db: Db, since: Date): Promise<number> {
  const result = await db.execute<{ count: number }>(sql`
    with current as (
      select distinct on (a.repository_id) a.repository_id, a.finished_at
      from analyses a
      where a.status = 'done'
      order by a.repository_id, a.is_public desc, a.finished_at desc nulls last
    )
    select count(*)::int as count
    from current c
    where c.finished_at < ${since}
      and not exists (
        select 1 from commit_checks k
        where k.repository_id = c.repository_id and k.checked_at >= ${since}
      )
      and not exists (
        select 1 from analyses q
        where q.repository_id = c.repository_id and q.status in ('queued', 'running')
      )
  `);
  return result.rows[0]?.count ?? 0;
}

/** Начало окна с учётом ручного запуска из админки. */
async function effectiveSince(db: Db, now: Date): Promise<Date> {
  const slot = currentSlotStart(now);
  const row = await db.query.settings.findFirst({ where: eq(settings.key, FORCE_SINCE_KEY) });
  const forced = typeof row?.value === 'string' ? new Date(row.value) : null;
  return forced && !Number.isNaN(forced.getTime()) && forced > slot && forced <= now ? forced : slot;
}

// ---------- Сверка ----------

export type CheckRunResult = {
  checked: number;
  unchanged: number;
  changed: number;
  errors: number;
  /** Не успели за этот вызов — доберёт следующий. */
  remaining: number;
};

/**
 * Сверяет всё, что ждёт в текущем окне, пока не выйдет время. `force` —
 * кнопка «Проверить сейчас»: окно начинается с момента нажатия.
 */
export async function runCommitCheck(
  db: Db,
  options: { deadline: number; trigger: CheckTrigger; force?: boolean },
): Promise<CheckRunResult> {
  const now = new Date();
  if (options.force) await saveSetting(db, FORCE_SINCE_KEY, now.toISOString());
  const since = await effectiveSince(db, now);

  const result: CheckRunResult = { checked: 0, unchanged: 0, changed: 0, errors: 0, remaining: 0 };
  const queue: DueRow[] = [];
  let exhausted = false;

  // Берём пачками: список может быть длинным, а время функции — нет.
  // Дозапрос один на всех: обработчики ждут общий промис, а не шлют свои.
  const inFlight = new Set<string>();
  let refill: Promise<void> | null = null;
  const next = async (): Promise<DueRow | null> => {
    while (queue.length === 0 && !exhausted) {
      refill ??= dueForCheck(db, since, 100).then((batch) => {
        // Строки, которые сейчас сверяют соседние обработчики, ещё не записаны.
        const fresh = batch.filter((row) => !inFlight.has(row.repository_id));
        if (fresh.length === 0) exhausted = true;
        queue.push(...fresh);
        refill = null;
      });
      await refill;
    }
    return queue.shift() ?? null;
  };

  await Promise.all(
    Array.from({ length: CHECK_CONCURRENCY }, async () => {
      while (Date.now() < options.deadline) {
        const row = await next();
        if (!row) return;
        if (inFlight.has(row.repository_id)) continue;
        inFlight.add(row.repository_id);
        try {
          const outcome = await checkOne(db, row, options.trigger);
          result.checked += 1;
          if (outcome === 'unchanged') result.unchanged += 1;
          else if (outcome === 'changed') result.changed += 1;
          else result.errors += 1;
        } finally {
          inFlight.delete(row.repository_id);
        }
      }
    }),
  );

  result.remaining = await countDue(db, since);
  await saveSetting(db, LAST_RUN_KEY, {
    at: new Date().toISOString(),
    since: since.toISOString(),
    trigger: options.trigger,
    ...result,
  });
  return result;
}

async function checkOne(db: Db, row: DueRow, trigger: CheckTrigger): Promise<CheckOutcome> {
  const record = (values: Partial<typeof commitChecks.$inferInsert> & { outcome: CheckOutcome }) =>
    db.insert(commitChecks).values({
      repositoryId: row.repository_id,
      analysisId: row.analysis_id,
      trigger,
      ...values,
    });

  if (!row.clone_url) {
    await record({ outcome: 'error', error: 'clone_url_missing' });
    return 'error';
  }

  let head: string | null;
  try {
    // Приватный — только токеном владельца; публичный — как при оценке.
    // Конвейер анализа подгружаем только здесь: сводку для главной и админки
    // он не касается, а тянет за собой весь сбор фактов и ИИ.
    const token = row.is_private
      ? await (await import('./analysis/run')).loadOwnerToken(db, row.requested_by, row.repository_id)
      : (process.env.SOURCECRAFT_PAT ?? null);
    if (row.is_private && !token) {
      await record({ outcome: 'error', error: 'private_repo_needs_owner_token' });
      return 'error';
    }
    head = await readRemoteHead(row.clone_url, token ?? undefined);
  } catch (err) {
    await record({ outcome: 'error', error: describe(err).slice(0, 300) });
    return 'error';
  }
  if (!head) {
    // Пустой репозиторий или HEAD не отдали — сравнивать не с чем.
    await record({ outcome: 'error', error: 'remote_head_missing' });
    return 'error';
  }

  if (row.baseline_sha && row.baseline_sha === head) {
    await record({ outcome: 'unchanged', headSha: head });
    return 'unchanged';
  }

  // Новые коммиты (или старая оценка не знает своего коммита) — переоцениваем
  // тем же, кто ставил прежнюю, с той же публикацией: новая сменит её сама.
  const reanalysisId = await db.transaction(async (tx) => {
    const [analysis] = await tx
      .insert(analyses)
      .values({
        repositoryId: row.repository_id,
        requestedBy: row.requested_by,
        status: 'queued',
        isPublic: row.is_public && !row.is_private,
      })
      .returning({ id: analyses.id });
    if (!analysis) return null;
    await tx.insert(analysisJobs).values({ analysisId: analysis.id });
    return analysis.id;
  });
  await record({ outcome: 'changed', headSha: head, reanalysisId });
  return 'changed';
}

// ---------- Переоценки ----------

/** Задача переоценки, заведённая проверкой коммитов (j — analysis_jobs). */
const reanalysisJobSql = sql`exists (
  select 1 from commit_checks k where k.reanalysis_id = j.analysis_id
)`;

/**
 * Задача занята: её считают (свежий лок) или её только что отдали на запуск
 * (метка `dispatch`) и она вот-вот будет захвачена. В отличие от каталога,
 * свежесозданная задача свободна: проверка заводит переоценки пачкой и тут же
 * их запускает.
 */
const DISPATCH_MARK = 'dispatch';
const busyJobSql = sql`(
  coalesce(j.locked_at > now() - interval '6 minutes', false)
  or (j.locked_at is null and coalesce(j.locked_by = ${DISPATCH_MARK}, false) and j.created_at > now() - interval '2 minutes')
)`;

/**
 * Следующая переоценка для запуска: id анализа или null — всё разобрано или
 * заняты все слоты. Под advisory-локом, чтобы два вызова не взяли одну.
 */
export async function dispatchReanalysis(db: Db): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('commits.dispatch'))`);
    const busy = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count from analysis_jobs j
      where ${reanalysisJobSql} and ${busyJobSql} and j.attempts < ${MAX_ATTEMPTS}
    `);
    if ((busy.rows[0]?.count ?? 0) >= REANALYSIS_CONCURRENCY) return null;

    const free = await tx.execute<{ id: string; analysis_id: string }>(sql`
      select j.id, j.analysis_id from analysis_jobs j
      where ${reanalysisJobSql} and not ${busyJobSql} and j.attempts < ${MAX_ATTEMPTS}
      order by j.created_at asc
      limit 1
    `);
    const next = free.rows[0];
    if (!next) return null;
    // Метка и свежий created_at держат задачу занятой, пока её не захватит запуск.
    await tx
      .update(analysisJobs)
      .set({ lockedAt: null, lockedBy: DISPATCH_MARK, createdAt: new Date() })
      .where(eq(analysisJobs.id, next.id));
    return next.analysis_id;
  });
}

/**
 * Прогоняет ждущие переоценки: каждая — отдельной функцией
 * POST /api/analyses/<id>/run, до REANALYSIS_CONCURRENCY одновременно.
 */
export async function driveReanalyses(
  db: Db,
  options: { origin: string; secret: string; claimUntil: number },
): Promise<number> {
  let launched = 0;
  await Promise.all(
    Array.from({ length: REANALYSIS_CONCURRENCY }, async () => {
      while (Date.now() < options.claimUntil) {
        const analysisId = await dispatchReanalysis(db);
        if (!analysisId) return;
        launched += 1;
        await fetch(`${options.origin}/api/analyses/${analysisId}/run`, {
          method: 'POST',
          headers: { authorization: `Bearer ${options.secret}` },
        }).catch(() => undefined);
      }
    }),
  );
  return launched;
}

// ---------- Сводка для админки и главной ----------

export type LastCheckRun = CheckRunResult & {
  at: string;
  since: string;
  trigger: CheckTrigger;
};

export type CommitCheckSummary = {
  lastRun: LastCheckRun | null;
  slotStart: string;
  nextSlot: string;
  /** Оценённых репозиториев всего. */
  evaluated: number;
  /** С начала текущего окна. */
  window: { unchanged: number; changed: number; errors: number };
  /** Ждут сверки в текущем окне. */
  due: number;
  /** Переоценки из-за новых коммитов, ещё не досчитанные. */
  pendingReanalyses: number;
};

export async function getCommitCheckSummary(db: Db): Promise<CommitCheckSummary> {
  const now = new Date();
  const since = await effectiveSince(db, now);
  const [lastRow, counts, evaluated, pending, due] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.key, LAST_RUN_KEY) }),
    db.execute<{ unchanged: number; changed: number; errors: number }>(sql`
      select
        count(*) filter (where outcome = 'unchanged')::int as unchanged,
        count(*) filter (where outcome = 'changed')::int as changed,
        count(*) filter (where outcome = 'error')::int as errors
      from commit_checks where checked_at >= ${since}
    `),
    db.execute<{ count: number }>(sql`
      select count(distinct repository_id)::int as count from analyses where status = 'done'
    `),
    db.execute<{ count: number }>(sql`
      select count(*)::int as count
      from commit_checks k join analyses a on a.id = k.reanalysis_id
      where a.status in ('queued', 'running')
    `),
    countDue(db, since),
  ]);
  const c = counts.rows[0];
  return {
    lastRun: (lastRow?.value as LastCheckRun | undefined) ?? null,
    slotStart: since.toISOString(),
    nextSlot: nextSlotStart(now).toISOString(),
    evaluated: evaluated.rows[0]?.count ?? 0,
    window: { unchanged: c?.unchanged ?? 0, changed: c?.changed ?? 0, errors: c?.errors ?? 0 },
    due,
    pendingReanalyses: pending.rows[0]?.count ?? 0,
  };
}

export type CommitCheckBrief = {
  lastRunAt: string | null;
  nextSlot: string;
  /** С начала текущего окна. */
  unchanged: number;
  changed: number;
};

/** Короткая сводка для главной: без подсчёта очереди, одним лёгким запросом. */
export async function getCommitCheckBrief(db: Db): Promise<CommitCheckBrief> {
  const now = new Date();
  const since = currentSlotStart(now);
  const [lastRow, counts] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.key, LAST_RUN_KEY) }),
    db.execute<{ unchanged: number; changed: number }>(sql`
      select
        count(*) filter (where outcome = 'unchanged')::int as unchanged,
        count(*) filter (where outcome = 'changed')::int as changed
      from commit_checks where checked_at >= ${since}
    `),
  ]);
  const last = lastRow?.value as LastCheckRun | undefined;
  return {
    lastRunAt: last?.at ?? null,
    nextSlot: nextSlotStart(now).toISOString(),
    unchanged: counts.rows[0]?.unchanged ?? 0,
    changed: counts.rows[0]?.changed ?? 0,
  };
}

export type RecentCheckRow = {
  id: string;
  orgRepo: string;
  analysisId: string;
  reanalysisId: string | null;
  reanalysisStatus: string | null;
  outcome: CheckOutcome;
  headSha: string | null;
  error: string | null;
  trigger: CheckTrigger;
  at: string;
};

export async function getRecentChecks(db: Db, limit = 40): Promise<RecentCheckRow[]> {
  const result = await db.execute<{
    id: string;
    org_slug: string;
    repo_slug: string;
    analysis_id: string;
    reanalysis_id: string | null;
    reanalysis_status: string | null;
    outcome: CheckOutcome;
    head_sha: string | null;
    error: string | null;
    trigger: CheckTrigger;
    checked_at: string | Date;
  }>(sql`
    select k.id, r.org_slug, r.repo_slug, k.analysis_id, k.reanalysis_id,
      ra.status as reanalysis_status, k.outcome, k.head_sha, k.error, k.trigger, k.checked_at
    from commit_checks k
    join repositories r on r.id = k.repository_id
    left join analyses ra on ra.id = k.reanalysis_id
    order by k.checked_at desc
    limit ${limit}
  `);
  return result.rows.map((r) => ({
    id: r.id,
    orgRepo: `${r.org_slug}/${r.repo_slug}`,
    analysisId: r.analysis_id,
    reanalysisId: r.reanalysis_id,
    reanalysisStatus: r.reanalysis_status,
    outcome: r.outcome,
    headSha: r.head_sha,
    error: r.error,
    trigger: r.trigger,
    at: new Date(r.checked_at).toISOString(),
  }));
}

// ---------- внутреннее ----------

async function saveSetting(db: Db, key: string, raw: unknown): Promise<void> {
  const value = raw as Record<string, unknown>;
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** Как в lib/git/clone: имя пользователя в URL isomorphic-git не принимает. */
function normalizeCloneUrl(cloneUrl: string): string {
  try {
    const url = new URL(cloneUrl);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return cloneUrl;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, tag: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(tag)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
