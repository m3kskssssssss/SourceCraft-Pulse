'use server';

// «Мои репозитории»: заявить репозиторий, подтвердить ключом, убрать.
//
// Ключ выдаётся при добавлении и дальше не меняется. Проверка идёт через
// публичный API SourceCraft: описание репозитория и список файлов в корне
// (подробнее — lib/ownership.ts). После подтверждения сразу ставим первый
// публичный прогон, чтобы бейдж ожил, не дожидаясь полуночи.

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { events, ownedRepositories, repositories } from '@/db/schema';
import { parseSlug, InvalidSlugError } from '@/lib/slug';
import { enqueueOwnerAnalysis, findVerifyKey, generateVerifyKey } from '@/lib/ownership';
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

  const existingRepo = await db.query.repositories.findFirst({
    where: and(eq(repositories.orgSlug, org), eq(repositories.repoSlug, repo)),
  });
  let repositoryId = existingRepo?.id;
  if (!repositoryId) {
    const [inserted] = await db
      .insert(repositories)
      .values({ orgSlug: org, repoSlug: repo })
      .returning({ id: repositories.id });
    if (!inserted) return { ok: false, error: 'Не удалось создать запись о репозитории.' };
    repositoryId = inserted.id;
  }

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
