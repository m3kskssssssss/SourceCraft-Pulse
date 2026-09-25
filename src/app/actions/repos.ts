'use server';

// «Мои репозитории»: заявить репозиторий, подтвердить, убрать.
//
// Подтвердить можно двумя способами:
//   - личным токеном SourceCraft: показываем репозитории пользователя и его
//     роли, admin и maintainer подтверждаются сразу (lib/token-ownership.ts);
//   - ключом: он выдаётся при добавлении, проверяем описание репозитория и
//     список файлов в корне (lib/ownership.ts).
// После подтверждения сразу ставим первый публичный прогон, чтобы бейдж
// ожил, не дожидаясь полуночи.

import { revalidatePath } from 'next/cache';
import { and, eq, isNotNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { events, ownedRepositories, repositories } from '@/db/schema';
import { parseSlug, tryParseSlug, InvalidSlugError } from '@/lib/slug';
import { enqueueOwnerAnalysis, findVerifyKey, generateVerifyKey } from '@/lib/ownership';
import {
  checkRepoRole,
  describeError,
  getTokenUser,
  isOwnerRole,
  parseOrgList,
  scanTokenRepositories,
  tokenSchema,
  userClient,
  type TokenRepo,
} from '@/lib/token-ownership';
import { getSourcecraftClient } from '@/lib/sourcecraft/client';
import { SourcecraftApiError, SourcecraftNotFoundError } from '@/lib/sourcecraft/errors';

export type RepoActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  /** Прогон, поставленный после подтверждения: его страница и запускает счёт. */
  analysisId?: string;
};

/** Сколько репозиториев можно держать в списке — чтобы суточный пересчёт не разросся. */
const MAX_OWNED = 20;

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
    .where(eq(ownedRepositories.userId, userId));
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

  const repositoryId = await ensureRepository(org, repo);
  if (!repositoryId) return { ok: false, error: 'Не удалось создать запись о репозитории.' };

  const inserted = await db
    .insert(ownedRepositories)
    .values({ userId, repositoryId, verifyKey: generateVerifyKey() })
    .onConflictDoNothing()
    .returning({ id: ownedRepositories.id });
  if (!inserted[0]) return { ok: false, error: `${org}/${repo} уже в вашем списке.` };

  revalidatePath('/repos');
  return { ok: true, message: `${org}/${repo} добавлен. Осталось подтвердить ключом.` };
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

export async function removeOwnedRepoAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const row = await findOwnRow(userId, String(formData.get('id') ?? ''));
  if (!row) return;
  await db.delete(ownedRepositories).where(eq(ownedRepositories.id, row.owned.id));
  revalidatePath('/repos');
}

// ---------- Подтверждение личным токеном SourceCraft ----------
//
// Два шага без хранения токена: сначала показываем репозитории пользователя
// с его ролями, потом он отмечает нужные и отправляет форму ещё раз — с тем же
// токеном из поля на странице. Роль перепроверяем на втором шаге: списку из
// браузера не верим.

export type TokenScanRepo = TokenRepo & {
  /** admin или maintainer — можно подтвердить. */
  owner: boolean;
  /** Уже подтверждён в списке этого пользователя. */
  added: boolean;
};

export type TokenScanState = {
  ok: boolean;
  error?: string;
  user?: { username: string | null; displayName: string | null };
  repos?: TokenScanRepo[];
  notes?: string[];
};

export async function scanTokenReposAction(
  _prev: TokenScanState | undefined,
  formData: FormData,
): Promise<TokenScanState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Требуется вход' };

  const token = tokenSchema.safeParse(String(formData.get('token') ?? ''));
  if (!token.success) return { ok: false, error: token.error.issues[0]?.message ?? 'Неверный токен' };

  let scan: Awaited<ReturnType<typeof scanTokenRepositories>>;
  try {
    scan = await scanTokenRepositories(token.data, parseOrgList(String(formData.get('orgs') ?? '')));
  } catch (err) {
    return { ok: false, error: `Не удалось прочитать профиль по токену: ${describeError(err)}.` };
  }

  const verified = new Set(
    (
      await db
        .select({ org: repositories.orgSlug, repo: repositories.repoSlug })
        .from(ownedRepositories)
        .innerJoin(repositories, eq(ownedRepositories.repositoryId, repositories.id))
        .where(and(eq(ownedRepositories.userId, userId), isNotNull(ownedRepositories.verifiedAt)))
    ).map((r) => `${r.org}/${r.repo}`.toLowerCase()),
  );

  return {
    ok: true,
    user: { username: scan.user.username, displayName: scan.user.displayName },
    repos: scan.repos.map((r) => ({
      ...r,
      owner: isOwnerRole(r.role),
      added: verified.has(`${r.org}/${r.repo}`.toLowerCase()),
    })),
    notes: scan.notes,
  };
}

export async function claimTokenReposAction(
  _prev: RepoActionState | undefined,
  formData: FormData,
): Promise<RepoActionState> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Требуется вход' };

  const token = tokenSchema.safeParse(String(formData.get('token') ?? ''));
  if (!token.success) return { ok: false, error: token.error.issues[0]?.message ?? 'Неверный токен' };

  const slugs = [
    ...new Set(formData.getAll('repo').map((v) => String(v))),
  ].flatMap((v) => {
    const parsed = tryParseSlug(v);
    return parsed ? [parsed] : [];
  });
  if (slugs.length === 0) return { ok: false, error: 'Отметьте хотя бы один репозиторий.' };

  const client = userClient(token.data);
  let scUserId: string;
  try {
    scUserId = (await getTokenUser(client)).id;
  } catch (err) {
    return { ok: false, error: `Не удалось прочитать профиль по токену: ${describeError(err)}.` };
  }

  const owned = await db
    .select({ repositoryId: ownedRepositories.repositoryId, verifiedAt: ownedRepositories.verifiedAt })
    .from(ownedRepositories)
    .where(eq(ownedRepositories.userId, userId));
  let slots = MAX_OWNED - owned.length;

  const added: string[] = [];
  const skipped: string[] = [];
  for (const { org, repo } of slugs) {
    const slug = `${org}/${repo}`;
    const { role } = await checkRepoRole(client, scUserId, org, repo);
    if (!isOwnerRole(role)) {
      skipped.push(`${slug} (нужна роль admin или maintainer)`);
      continue;
    }
    try {
      const repository = await client.getRepository(org, repo);
      if (repository.visibility && repository.visibility !== 'public') {
        skipped.push(`${slug} (не публичный)`);
        continue;
      }
    } catch (err) {
      skipped.push(`${slug} (${describeError(err)})`);
      continue;
    }

    const repositoryId = await ensureRepository(org, repo);
    if (!repositoryId) {
      skipped.push(`${slug} (не удалось сохранить)`);
      continue;
    }
    const existing = owned.find((o) => o.repositoryId === repositoryId);
    if (existing?.verifiedAt) continue;
    if (!existing) {
      if (slots <= 0) {
        skipped.push(`${slug} (в списке уже ${MAX_OWNED} репозиториев)`);
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
      payload: { repositoryId, org, repo, by: 'token', role },
    });
    await enqueueOwnerAnalysis(db, userId, repositoryId, 'verified');
    added.push(slug);
  }

  revalidatePath('/repos');
  if (added.length === 0) {
    return {
      ok: false,
      error: skipped.length ? `Не подтверждены: ${skipped.join(', ')}.` : 'Все отмеченные уже подтверждены.',
    };
  }
  return {
    ok: true,
    message:
      `Подтверждены: ${added.join(', ')}. Первые оценки в очереди, дальше — каждый день в 00:00.` +
      (skipped.length ? ` Не подтверждены: ${skipped.join(', ')}.` : ''),
  };
}

/** id строки repositories для слага; нет — создаём. */
async function ensureRepository(org: string, repo: string): Promise<string | null> {
  const existing = await db.query.repositories.findFirst({
    where: and(eq(repositories.orgSlug, org), eq(repositories.repoSlug, repo)),
  });
  if (existing) return existing.id;
  const [inserted] = await db
    .insert(repositories)
    .values({ orgSlug: org, repoSlug: repo })
    .onConflictDoNothing()
    .returning({ id: repositories.id });
  if (inserted) return inserted.id;
  // Проиграли гонку параллельной вставке — строка уже есть.
  const again = await db.query.repositories.findFirst({
    where: and(eq(repositories.orgSlug, org), eq(repositories.repoSlug, repo)),
  });
  return again?.id ?? null;
}

async function findOwnRow(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db
    .select({ owned: ownedRepositories, repo: repositories })
    .from(ownedRepositories)
    .innerJoin(repositories, eq(ownedRepositories.repositoryId, repositories.id))
    .where(and(eq(ownedRepositories.id, id), eq(ownedRepositories.userId, userId)))
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
