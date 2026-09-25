// Синхронизация «Моих репозиториев» по личному токену SourceCraft.
//
// Токен хранится зашифрованным (token-crypto.ts) в sourcecraft_tokens. Раз в
// SYNC_INTERVAL_MS мы проходим по сохранённым токенам и подтверждаем новые
// репозитории, где у владельца токена роль admin или maintainer:
//   - в docker это делает воркер, он и так запускается раз в минуту;
//   - на Vercel — внешний вызов /api/cron/sync-tokens.
// По новым репозиториям сразу ставится первая оценка.
//
// Чего синхронизация не делает: не снимает подтверждение, если роль пропала,
// и не возвращает репозитории, которые пользователь убрал сам (removed_at).
// Токен, который SourceCraft перестал принимать, помечается invalid_at и
// больше не используется, пока пользователь не вставит новый.

import { and, asc, eq, isNull, lt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { events, ownedRepositories, sourcecraftTokens } from '../db/schema';
import { enqueueOwnerAnalysis, ensureRepository, generateVerifyKey } from './ownership';
import { SourcecraftApiError } from './sourcecraft/errors';
import { decryptToken, encryptToken } from './token-crypto';
import { describeError, isOwnerRole, scanTokenRepositories, type TokenUser } from './token-ownership';

type Db = NodePgDatabase<typeof schema>;

export const SYNC_INTERVAL_MS = 5 * 60 * 1000;
/** Сколько репозиториев можно держать в списке — чтобы суточный пересчёт не разросся. */
export const MAX_OWNED = 20;
/** Сколько токенов синхронизируем за один проход. */
const BATCH = 20;

export type SyncReport = {
  user: TokenUser;
  added: string[];
  already: string[];
  skipped: Array<{ slug: string; reason: string }>;
  notes: string[];
};

/**
 * Находит репозитории владельца токена и подтверждает новые. Бросает, только
 * если по токену не удалось узнать пользователя (токен не принят, сеть).
 */
export async function syncOwnedFromToken(
  db: Db,
  userId: string,
  token: string,
  extraOrgs: string[],
): Promise<SyncReport> {
  const scan = await scanTokenRepositories(token, extraOrgs);

  const owned = await db
    .select({
      repositoryId: ownedRepositories.repositoryId,
      verifiedAt: ownedRepositories.verifiedAt,
      removedAt: ownedRepositories.removedAt,
    })
    .from(ownedRepositories)
    .where(eq(ownedRepositories.userId, userId));
  let slots = MAX_OWNED - owned.filter((o) => !o.removedAt).length;

  const added: string[] = [];
  const already: string[] = [];
  const skipped: Array<{ slug: string; reason: string }> = [];
  for (const r of scan.repos) {
    const slug = `${r.org}/${r.repo}`;
    if (!isOwnerRole(r.role)) {
      skipped.push({
        slug,
        reason: r.role ? `роль ${r.role}, нужна admin или maintainer` : (r.note ?? 'роль не найдена'),
      });
      continue;
    }

    const repositoryId = await ensureRepository(db, r.org, r.repo);
    if (!repositoryId) {
      skipped.push({ slug, reason: 'не удалось сохранить' });
      continue;
    }
    const existing = owned.find((o) => o.repositoryId === repositoryId);
    if (existing?.removedAt) {
      skipped.push({ slug, reason: 'вы убрали его из списка' });
      continue;
    }
    if (existing?.verifiedAt) {
      already.push(slug);
      continue;
    }
    if (!existing) {
      if (slots <= 0) {
        skipped.push({ slug, reason: `в списке уже ${MAX_OWNED} репозиториев` });
        continue;
      }
      slots -= 1;
    }

    const now = new Date();
    await db
      .insert(ownedRepositories)
      .values({ userId, repositoryId, verifyKey: generateVerifyKey(), verifiedAt: now, lastCheckAt: now })
      .onConflictDoUpdate({
        target: [ownedRepositories.userId, ownedRepositories.repositoryId],
        set: { verifiedAt: now, lastCheckAt: now, lastCheckError: null },
      });
    await db.insert(events).values({
      userId,
      kind: 'repository.verified',
      payload: { repositoryId, org: r.org, repo: r.repo, by: 'token', role: r.role },
    });
    await enqueueOwnerAnalysis(db, userId, repositoryId, 'verified');
    added.push(slug);
  }

  return { user: scan.user, added, already, skipped, notes: scan.notes };
}

/** Сохраняет (или заменяет) токен пользователя зашифрованным. */
export async function saveToken(
  db: Db,
  userId: string,
  token: string,
  user: TokenUser,
  extraOrgs: string[],
): Promise<void> {
  const now = new Date();
  const values = {
    tokenEncrypted: encryptToken(token),
    scUserId: user.id,
    scUsername: user.username,
    scDisplayName: user.displayName,
    extraOrgs: extraOrgs.join(',') || null,
    lastSyncAt: now,
    lastSyncError: null,
    invalidAt: null,
    updatedAt: now,
  };
  await db
    .insert(sourcecraftTokens)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: sourcecraftTokens.userId, set: values });
}

export function storedExtraOrgs(raw: string | null): string[] {
  return raw ? raw.split(',').filter(Boolean) : [];
}

/**
 * Синхронизация по сохранённому токену. Результат и ошибка пишутся в строку
 * токена; 401 от SourceCraft помечает токен недействительным.
 */
export async function syncStoredToken(
  db: Db,
  userId: string,
): Promise<{ ok: true; report: SyncReport } | { ok: false; error: string }> {
  const row = await db.query.sourcecraftTokens.findFirst({
    where: eq(sourcecraftTokens.userId, userId),
  });
  if (!row) return { ok: false, error: 'Токен не сохранён' };

  let token: string;
  try {
    token = decryptToken(row.tokenEncrypted);
  } catch {
    // Ключ шифрования сменили — старый токен уже не прочитать.
    const error = 'Сохранённый токен не расшифровывается — вставьте его заново.';
    await markFailed(db, userId, error, true);
    return { ok: false, error };
  }

  try {
    const report = await syncOwnedFromToken(db, userId, token, storedExtraOrgs(row.extraOrgs));
    await db
      .update(sourcecraftTokens)
      .set({
        lastSyncAt: new Date(),
        lastSyncError: null,
        scUsername: report.user.username,
        scDisplayName: report.user.displayName,
      })
      .where(eq(sourcecraftTokens.userId, userId));
    return { ok: true, report };
  } catch (err) {
    const invalid = err instanceof SourcecraftApiError && err.status === 401;
    const error = invalid
      ? 'SourceCraft больше не принимает токен — возможно, срок истёк или его удалили. Вставьте новый.'
      : `Синхронизация не удалась: ${describeError(err)}.`;
    await markFailed(db, userId, error, invalid);
    return { ok: false, error };
  }
}

async function markFailed(db: Db, userId: string, error: string, invalid: boolean): Promise<void> {
  const now = new Date();
  await db
    .update(sourcecraftTokens)
    .set({ lastSyncAt: now, lastSyncError: error, ...(invalid ? { invalidAt: now } : {}) })
    .where(eq(sourcecraftTokens.userId, userId));
}

/**
 * Проход автосинхронизации: токены, которые пора синхронизировать, по одному.
 * Недействительные пропускаем — их ждёт замена от пользователя.
 */
export async function syncDueTokens(
  db: Db,
  now: Date = new Date(),
): Promise<{ synced: number; failed: number; added: number }> {
  const dueBefore = new Date(now.getTime() - SYNC_INTERVAL_MS);
  const due = await db
    .select({ userId: sourcecraftTokens.userId })
    .from(sourcecraftTokens)
    .where(
      and(
        isNull(sourcecraftTokens.invalidAt),
        or(isNull(sourcecraftTokens.lastSyncAt), lt(sourcecraftTokens.lastSyncAt, dueBefore)),
      ),
    )
    .orderBy(asc(sourcecraftTokens.lastSyncAt))
    .limit(BATCH);

  const totals = { synced: 0, failed: 0, added: 0 };
  for (const { userId } of due) {
    const result = await syncStoredToken(db, userId);
    if (result.ok) {
      totals.synced += 1;
      totals.added += result.report.added.length;
    } else {
      totals.failed += 1;
    }
  }
  return totals;
}
