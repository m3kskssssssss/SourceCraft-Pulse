// Свои репозитории: ключ подтверждения и суточный пересчёт.
//
// Как доказать, что репозиторий ваш. API SourceCraft не говорит, кто владелец,
// и содержимое файлов не отдаёт — только описание репозитория и список файлов
// в дереве. Поэтому ключ принимаем в одном из двух мест:
//   - в описании репозитория (строкой где угодно в тексте);
//   - файлом в корне ветки по умолчанию: имя файла — сам ключ, расширение
//     любое (pulse-verify-….txt), содержимое не важно.
// И то и другое может сделать только тот, у кого есть права на запись.
//
// Суточный пересчёт. Подтверждённые репозитории раз в сутки, после полуночи
// по BADGE_REFRESH_TZ (по умолчанию Europe/Moscow), ставятся в очередь заново.
// Прогон сразу публичный: владелец сам попросил живой бейдж, а бейдж читает
// только опубликованные анализы. День последнего пересчёта хранится в строке,
// так что повторный вызов в те же сутки ничего не делает.

import { randomBytes } from 'node:crypto';
import { and, eq, ilike, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { analyses, analysisJobs, events, ownedRepositories, repositories } from '../db/schema';

type Db = NodePgDatabase<typeof schema>;

export const KEY_PREFIX = 'pulse-verify-';
const DEFAULT_TZ = 'Europe/Moscow';

/** Новый ключ: префикс, чтобы его было видно в описании, и 16 hex-символов. */
export function generateVerifyKey(): string {
  return KEY_PREFIX + randomBytes(8).toString('hex');
}

/** Где нашёлся ключ; null — нигде. */
export type KeyLocation = 'description' | 'file' | null;

/**
 * Ищет ключ в описании и в именах файлов корня. Чистая функция — ради теста.
 * Файл засчитываем, если имя равно ключу или ключ плюс расширение.
 */
export function findVerifyKey(
  key: string,
  description: string | null | undefined,
  rootNames: Array<string | null | undefined>,
): KeyLocation {
  if (description && description.includes(key)) return 'description';
  for (const name of rootNames) {
    if (!name) continue;
    if (name === key || name.startsWith(`${key}.`)) return 'file';
  }
  return null;
}

export function refreshTimeZone(): string {
  return process.env.BADGE_REFRESH_TZ || DEFAULT_TZ;
}

/** Календарный день YYYY-MM-DD в часовом поясе пересчёта. */
export function dayIn(date: Date, timeZone: string = refreshTimeZone()): string {
  // en-CA форматирует ровно как YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Ставит в очередь публичный прогон репозитория от имени владельца.
 * Если по репозиторию уже что-то ждёт или считается — второй не заводим.
 */
export async function enqueueOwnerAnalysis(
  db: Db,
  userId: string,
  repositoryId: string,
  reason: 'verified' | 'daily' | 'manual',
): Promise<string | null> {
  const pending = await db
    .select({ id: analyses.id })
    .from(analyses)
    .where(
      and(eq(analyses.repositoryId, repositoryId), inArray(analyses.status, ['queued', 'running'])),
    )
    .limit(1);
  if (pending[0]) return null;

  const [analysis] = await db
    .insert(analyses)
    .values({ repositoryId, requestedBy: userId, status: 'queued', isPublic: true })
    .returning({ id: analyses.id });
  if (!analysis) return null;

  await db.insert(analysisJobs).values({ analysisId: analysis.id });
  await db.insert(events).values({
    userId,
    kind: 'analysis.queued',
    payload: { analysisId: analysis.id, repositoryId, reason },
  });
  return analysis.id;
}

/**
 * Суточный пересчёт: по одному прогону на каждый подтверждённый репозиторий,
 * у которого уже есть готовая оценка и
 * который сегодня ещё не пересчитывали. Если у репозитория несколько
 * подтверждённых владельцев, прогон всё равно один — от первого из них.
 */
export async function enqueueDailyRefresh(
  db: Db,
  now: Date = new Date(),
): Promise<{ day: string; queued: number }> {
  const day = dayIn(now);

  const due = await db
    .select({
      id: ownedRepositories.id,
      userId: ownedRepositories.userId,
      repositoryId: ownedRepositories.repositoryId,
    })
    .from(ownedRepositories)
    .where(
      and(
        isNotNull(ownedRepositories.verifiedAt),
        isNull(ownedRepositories.removedAt),
        or(isNull(ownedRepositories.refreshedOn), ne(ownedRepositories.refreshedOn, day)),
        // Пересчитываем только то, что пользователь уже хоть раз оценил сам:
        // синхронизация по токену добавляет репозитории без оценки, и ночной
        // пересчёт не должен оценивать их за него. Подзапрос — сырым SQL:
        // drizzle теряет имя таблицы в коррелированном подзапросе.
        sql`exists (select 1 from analyses a where a.repository_id = "owned_repositories"."repository_id" and a.status = 'done')`,
      ),
    )
    .orderBy(ownedRepositories.verifiedAt);

  const seen = new Set<string>();
  let queued = 0;
  for (const row of due) {
    // Отмечаем день до постановки: упадёт прогон — повторять его в те же
    // сутки по кругу не надо, завтра будет новый.
    await db
      .update(ownedRepositories)
      .set({ refreshedOn: day })
      .where(eq(ownedRepositories.id, row.id));
    if (seen.has(row.repositoryId)) continue;
    seen.add(row.repositoryId);
    if (await enqueueOwnerAnalysis(db, row.userId, row.repositoryId, 'daily')) queued += 1;
  }
  return { day, queued };
}

/** Подтверждён ли репозиторий хоть кем-то. Нужно карточке бейджа. */
export async function isRepositoryVerified(db: Db, org: string, repo: string): Promise<boolean> {
  const rows = await db
    .select({ id: ownedRepositories.id })
    .from(ownedRepositories)
    .innerJoin(repositories, eq(ownedRepositories.repositoryId, repositories.id))
    .where(
      and(
        ilike(repositories.orgSlug, org),
        ilike(repositories.repoSlug, repo),
        isNotNull(ownedRepositories.verifiedAt),
        isNull(ownedRepositories.removedAt),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Прогоны своих репозиториев, которые ждут в очереди. Их узнаём по флагу
 * публикации: обычная оценка встаёт в очередь приватной, публичной — только
 * постановка отсюда.
 */
export async function listQueuedOwnerAnalyses(db: Db, limit = 50): Promise<string[]> {
  const rows = await db
    .select({ id: analyses.id })
    .from(analyses)
    .where(and(eq(analyses.status, 'queued'), eq(analyses.isPublic, true)))
    .orderBy(analyses.createdAt)
    .limit(limit);
  return rows.map((r) => r.id);
}

/** id строки repositories для слага; нет — создаём. */
export async function ensureRepository(db: Db, org: string, repo: string): Promise<string | null> {
  const where = and(eq(repositories.orgSlug, org), eq(repositories.repoSlug, repo));
  const existing = await db.select({ id: repositories.id }).from(repositories).where(where).limit(1);
  if (existing[0]) return existing[0].id;
  const [inserted] = await db
    .insert(repositories)
    .values({ orgSlug: org, repoSlug: repo })
    .onConflictDoNothing()
    .returning({ id: repositories.id });
  if (inserted) return inserted.id;
  // Проиграли гонку параллельной вставке — строка уже есть.
  const again = await db.select({ id: repositories.id }).from(repositories).where(where).limit(1);
  return again[0]?.id ?? null;
}
