'use server';

// «Мои репозитории»: заявить репозиторий, подтвердить, убрать.
//
// Подтвердить можно двумя способами:
//   - личным токеном SourceCraft: токен сохраняется зашифрованным, и раз в
//     пять минут мы подтягиваем новые репозитории, где у пользователя роль
//     admin или maintainer (lib/token-sync.ts);
//   - ключом: он выдаётся при добавлении, проверяем описание репозитория и
//     список файлов в корне (lib/ownership.ts).
// После подтверждения сразу ставим первый публичный прогон, чтобы бейдж
// ожил, не дожидаясь полуночи.

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { events, ownedRepositories, repositories, sourcecraftTokens } from '@/db/schema';
import { parseSlug, InvalidSlugError } from '@/lib/slug';
import {
  enqueueOwnerAnalysis,
  ensureRepository,
  findVerifyKey,
  generateVerifyKey,
} from '@/lib/ownership';
import { describeError, parseOrgList, tokenSchema } from '@/lib/token-ownership';
import {
  MAX_OWNED,
  saveToken,
  syncOwnedFromToken,
  syncStoredToken,
  type SyncReport,
} from '@/lib/token-sync';
import { getSourcecraftClient } from '@/lib/sourcecraft/client';
import { SourcecraftApiError, SourcecraftNotFoundError } from '@/lib/sourcecraft/errors';

export type RepoActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  /** Прогон, поставленный после подтверждения: его страница и запускает счёт. */
  analysisId?: string;
};

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function addOwnedRepoAction(
  _prev: RepoActionState | undefined,
  formData: FormData,
): Promise<RepoActionState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Требуется вход' };

  let org: string;
  let repo: string;
  try {
    ({ org, repo } = parseSlug(String(formData.get('target') ?? '')));
  } catch (err) {
    return { ok: false, error: err instanceof InvalidSlugError ? err.message : 'Неверный адрес' };
  }

  const owned = await db
    .select({ id: ownedRepositories.id })
    .from(ownedRepositories)
    .where(and(eq(ownedRepositories.userId, userId), isNull(ownedRepositories.removedAt)));
  if (owned.length >= MAX_OWNED) {
    return { ok: false, error: `В списке уже ${MAX_OWNED} репозиториев — уберите лишние.` };
  }

  // Существование и публичность — как при обычной оценке: приватный
  // репозиторий мы всё равно не сможем ни проверить, ни посчитать.
  try {
    const repository = await getSourcecraftClient().getRepository(org, repo);
    if (repository.visibility && repository.visibility !== 'public') {
      return { ok: false, error: 'Приватные и internal-репозитории не поддерживаются.' };
    }
  } catch (err) {
    return { ok: false, error: describeScError(err, org, repo) };
  }

  const repositoryId = await ensureRepository(db, org, repo);
  if (!repositoryId) return { ok: false, error: 'Не удалось создать запись о репозитории.' };

  const existing = await db.query.ownedRepositories.findFirst({
    where: and(eq(ownedRepositories.userId, userId), eq(ownedRepositories.repositoryId, repositoryId)),
  });
  if (existing && !existing.removedAt) return { ok: false, error: `${org}/${repo} уже в вашем списке.` };

  if (existing) {
    // Убранный раньше возвращаем с тем же ключом и подтверждением.
    await db
      .update(ownedRepositories)
      .set({ removedAt: null })
      .where(eq(ownedRepositories.id, existing.id));
  } else {
    await db
      .insert(ownedRepositories)
      .values({ userId, repositoryId, verifyKey: generateVerifyKey() })
      .onConflictDoNothing();
  }

  revalidatePath('/repos');
  return {
    ok: true,
    message: existing?.verifiedAt
      ? `${org}/${repo} снова в списке.`
      : `${org}/${repo} добавлен. Осталось подтвердить ключом.`,
  };
}

export async function verifyOwnedRepoAction(
  _prev: RepoActionState | undefined,
  formData: FormData,
): Promise<RepoActionState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Требуется вход' };

  const row = await findOwnRow(userId, String(formData.get('id') ?? ''));
  if (!row) return { ok: false, error: 'Репозиторий не найден в вашем списке' };
  const { owned, repo } = row;
  if (owned.verifiedAt) return { ok: true, message: 'Уже подтверждён.' };

  const client = getSourcecraftClient();
  let location: ReturnType<typeof findVerifyKey> = null;
  try {
    const repository = await client.getRepository(repo.orgSlug, repo.repoSlug);
    location = findVerifyKey(owned.verifyKey, repository.description, []);
    if (!location) {
      // Файлы корня без рекурсии; ключ ищем по имени. Больше пятисот файлов
      // в корне почти не бывает, а бесконечно листать незачем.
      const root = await client.collect(
        (p) => client.listTree(repo.orgSlug, repo.repoSlug, p),
        'trees',
        500,
      );
      location = findVerifyKey(
        owned.verifyKey,
        null,
        root.map((entry) => entry.name ?? entry.path),
      );
    }
  } catch (err) {
    const error = describeScError(err, repo.orgSlug, repo.repoSlug);
    await db
      .update(ownedRepositories)
      .set({ lastCheckAt: new Date(), lastCheckError: error })
      .where(eq(ownedRepositories.id, owned.id));
    revalidatePath('/repos');
    return { ok: false, error };
  }

  if (!location) {
    const error = 'Ключ не найден ни в описании, ни среди файлов в корне ветки по умолчанию.';
    await db
      .update(ownedRepositories)
      .set({ lastCheckAt: new Date(), lastCheckError: error })
      .where(eq(ownedRepositories.id, owned.id));
    revalidatePath('/repos');
    return { ok: false, error };
  }

  await db
    .update(ownedRepositories)
    .set({ verifiedAt: new Date(), lastCheckAt: new Date(), lastCheckError: null })
    .where(eq(ownedRepositories.id, owned.id));
  await db.insert(events).values({
    userId,
    kind: 'repository.verified',
    payload: { repositoryId: repo.id, org: repo.orgSlug, repo: repo.repoSlug, by: location },
  });
  const analysisId = await enqueueOwnerAnalysis(db, userId, repo.id, 'verified');

  revalidatePath('/repos');
  return {
    ok: true,
    // Прогон не встал, если по репозиторию уже что-то считается: тогда бейдж
    // оживёт с ближайшим суточным пересчётом.
    message: analysisId
      ? 'Подтверждено. Первая оценка уже в очереди, дальше бейдж обновляется каждый день в 00:00. Ключ из репозитория можно убрать.'
      : 'Подтверждено. По репозиторию уже идёт оценка, бейдж обновится при пересчёте в 00:00. Ключ из репозитория можно убрать.',
    analysisId: analysisId ?? undefined,
  };
}

/**
 * Убрать из своих. Строку не удаляем, а помечаем: иначе автосинхронизация
 * по токену вернула бы репозиторий через пять минут.
 */
export async function removeOwnedRepoAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const row = await findOwnRow(userId, String(formData.get('id') ?? ''));
  if (!row) return;
  await db
    .update(ownedRepositories)
    .set({ removedAt: new Date() })
    .where(eq(ownedRepositories.id, row.owned.id));
  revalidatePath('/repos');
}

// ---------- Личный токен SourceCraft ----------

export type TokenSyncState = {
  ok: boolean;
  error?: string;
  /** Чей токен: показываем, чтобы пользователь увидел, что вставил свой. */
  user?: { username: string | null; displayName: string | null };
  added?: string[];
  already?: string[];
  skipped?: Array<{ slug: string; reason: string }>;
  notes?: string[];
};

function toState(report: SyncReport): TokenSyncState {
  return {
    ok: true,
    user: { username: report.user.username, displayName: report.user.displayName },
    added: report.added,
    already: report.already,
    skipped: report.skipped,
    notes: report.notes,
  };
}

/** Сохранить новый токен (или заменить старый) и сразу синхронизировать. */
export async function saveTokenAction(
  _prev: TokenSyncState | undefined,
  formData: FormData,
): Promise<TokenSyncState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Требуется вход' };

  const token = tokenSchema.safeParse(String(formData.get('token') ?? ''));
  if (!token.success) return { ok: false, error: token.error.issues[0]?.message ?? 'Неверный токен' };
  const extraOrgs = parseOrgList(String(formData.get('orgs') ?? ''));

  let report: SyncReport;
  try {
    report = await syncOwnedFromToken(db, userId, token.data, extraOrgs);
  } catch (err) {
    // Токен, по которому не узнать владельца, не сохраняем.
    return { ok: false, error: `Не удалось прочитать профиль по токену: ${describeError(err)}.` };
  }

  try {
    await saveToken(db, userId, token.data, report.user, extraOrgs);
  } catch (err) {
    revalidatePath('/repos');
    return {
      ...toState(report),
      ok: false,
      error: `Репозитории подтянуты, но токен не сохранён — автосинхронизация не включится: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  await db.insert(events).values({ userId, kind: 'sourcecraft_token.saved', payload: {} });
  revalidatePath('/repos');
  return toState(report);
}

/** «Синхронизировать сейчас» по сохранённому токену. */
export async function syncNowAction(
  _prev: TokenSyncState | undefined,
  _formData: FormData,
): Promise<TokenSyncState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Требуется вход' };
  const result = await syncStoredToken(db, userId);
  revalidatePath('/repos');
  return result.ok ? toState(result.report) : { ok: false, error: result.error };
}

/** Отключить автосинхронизацию: токен удаляется, подтверждённые остаются. */
export async function deleteTokenAction(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await db.delete(sourcecraftTokens).where(eq(sourcecraftTokens.userId, userId));
  await db.insert(events).values({ userId, kind: 'sourcecraft_token.deleted', payload: {} });
  revalidatePath('/repos');
}

async function findOwnRow(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db
    .select({ owned: ownedRepositories, repo: repositories })
    .from(ownedRepositories)
    .innerJoin(repositories, eq(ownedRepositories.repositoryId, repositories.id))
    .where(
      and(
        eq(ownedRepositories.id, id),
        eq(ownedRepositories.userId, userId),
        isNull(ownedRepositories.removedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function describeScError(err: unknown, org: string, repo: string): string {
  if (err instanceof SourcecraftNotFoundError) {
    return `Репозиторий ${org}/${repo} не найден или недоступен.`;
  }
  if (err instanceof SourcecraftApiError) {
    return `SourceCraft вернул ошибку ${err.status}: ${err.message}`;
  }
  return 'Не удалось связаться с SourceCraft.';
}
