// Подтверждение своих репозиториев личным токеном SourceCraft.
//
// С токеном пользователя мы:
//   1) узнаём, чей это токен: GET /user → id и username;
//   2) собираем доступные ему репозитории: GET /me/repos (эндпоинт добавлен
//      во время хакатона); если он недоступен — по организациям:
//      GET /orgs/{org}/repos для личного пространства и названных организаций;
//   3) по каждому репозиторию, включая приватные, смотрим роли:
//      GET /repos/…/roles, и ищем там пользователя из шага 1. Владельцем
//      считаем admin и maintainer.
//
// Токен хранится только зашифрованным (token-sync.ts, token-crypto.ts) и не
// логируется. Если роли не отдались или пользователя в них нет (права выданы
// на уровне организации), репозиторий остаётся без подтверждения — для
// публичных есть ключ в описании или файлом.

import { z } from 'zod';
import {
  SourcecraftClient,
  type RepoRole,
  type Repository,
  type SubjectRole,
} from './sourcecraft/client';
import { SourcecraftApiError, SourcecraftNotFoundError } from './sourcecraft/errors';
import { tryParseSlug } from './slug';

export const OWNER_ROLES: readonly RepoRole[] = ['admin', 'maintainer'];

/** Сколько репозиториев на организацию и всего проверяем за раз. */
const REPOS_PER_ORG = 100;
const MAX_CHECKED = 60;
/** Сколько репозиториев берём из /me/repos. */
const MY_REPOS_LIMIT = 300;
const MAX_EXTRA_ORGS = 5;

export const tokenSchema = z
  .string()
  .trim()
  .min(10, 'Токен слишком короткий')
  .max(4096, 'Токен слишком длинный')
  .regex(/^\S+$/, 'В токене не должно быть пробелов');

export type TokenUser = { id: string; username: string | null; displayName: string | null };

export type TokenRepo = {
  org: string;
  repo: string;
  visibility: string | null;
  /** Роль пользователя в репозитории; null — не нашли. */
  role: RepoRole | null;
  /** Почему роль не узнали, если не узнали. */
  note: string | null;
};

/** Роль пользователя среди ролей репозитория. Чистая функция — ради теста. */
export function findUserRole(roles: SubjectRole[], userId: string): RepoRole | null {
  for (const item of roles) {
    if (item.subject?.type === 'user' && item.subject.id === userId && item.role) {
      return item.role;
    }
  }
  return null;
}

export function isOwnerRole(role: RepoRole | null): boolean {
  return role !== null && OWNER_ROLES.includes(role);
}

/** Разбирает поле «другие организации»: через запятую или пробел. */
export function parseOrgList(raw: string): string[] {
  const orgs = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().replace(/^https?:\/\/[^/]+\//i, '').replace(/\/.*$/, ''))
    .filter((s) => s && tryParseSlug(`${s}/x`) !== null);
  return [...new Set(orgs)].slice(0, MAX_EXTRA_ORGS);
}

export function userClient(token: string): SourcecraftClient {
  return new SourcecraftClient({ token });
}

export async function getTokenUser(client: SourcecraftClient): Promise<TokenUser> {
  const profile = await client.getCurrentUser();
  if (!profile.id) throw new Error('SourceCraft не вернул id пользователя');
  return {
    id: profile.id,
    username: profile.username ?? null,
    displayName: profile.display_name ?? null,
  };
}

/** Роль пользователя в одном репозитории, с объяснением, если не вышло. */
export async function checkRepoRole(
  client: SourcecraftClient,
  userId: string,
  org: string,
  repo: string,
): Promise<{ role: RepoRole | null; note: string | null }> {
  try {
    const roles = await client.collect(
      (p) => client.listRepoRoles(org, repo, p),
      'subject_roles',
      500,
    );
    const role = findUserRole(roles, userId);
    return { role, note: role ? null : 'вас нет в ролях репозитория' };
  } catch (err) {
    return { role: null, note: `роли не получены: ${describeError(err)}` };
  }
}

export async function scanTokenRepositories(
  token: string,
  extraOrgs: string[],
): Promise<{ user: TokenUser; repos: TokenRepo[]; notes: string[] }> {
  const client = userClient(token);
  const user = await getTokenUser(client);

  const notes: string[] = [];
  const found: Repository[] = [];

  // Основной источник — GET /me/repos: репозитории организаций, где владелец
  // токена участник. Личное пространство он НЕ отдаёт (проверено 26.09 на
  // аккаунте ilugly: только lct-hackaton-2026, без ilugly/*), поэтому его
  // обходим всегда, а при недоступном /me/repos — ещё и названные организации.
  try {
    found.push(
      ...(await client.collect((p) => client.listMyRepositories(p), 'repositories', MY_REPOS_LIMIT)),
    );
  } catch (err) {
    notes.push(`Список «мои репозитории» недоступен (${describeError(err)}) — ищем по организациям.`);
  }

  const orgs = [...new Set([user.username, ...extraOrgs].filter((o): o is string => Boolean(o)))];
  for (const org of orgs) {
    try {
      const list = await client.collect(
        (p) => client.listOrganizationRepositories(org, p),
        'repositories',
        REPOS_PER_ORG,
      );
      found.push(...list);
    } catch (err) {
      // Личного пространства с именем пользователя может и не быть — молчим.
      if (org === user.username && err instanceof SourcecraftNotFoundError) continue;
      notes.push(`${org}: ${describeError(err)}`);
    }
  }

  const unique = new Map<string, TokenRepo>();
  for (const r of found) {
    const org = r.organization?.slug;
    const repo = r.slug;
    if (!org || !repo) continue;
    unique.set(`${org}/${repo}`.toLowerCase(), {
      org,
      repo,
      visibility: r.visibility ?? null,
      role: null,
      note: null,
    });
  }

  // Приватные тоже проверяем: их оценка — личная, правами токена владельца,
  // и в публичный рейтинг она не попадает.
  const repos = [...unique.values()];
  const toCheck = repos.slice(0, MAX_CHECKED);
  if (repos.length > MAX_CHECKED) {
    notes.push(`Роли проверены у первых ${MAX_CHECKED} репозиториев из ${repos.length}.`);
  }
  await Promise.all(
    toCheck.map(async (r) => {
      const { role, note } = await checkRepoRole(client, user.id, r.org, r.repo);
      r.role = role;
      r.note = note;
    }),
  );

  repos.sort(
    (a, b) =>
      Number(isOwnerRole(b.role)) - Number(isOwnerRole(a.role)) ||
      `${a.org}/${a.repo}`.localeCompare(`${b.org}/${b.repo}`),
  );
  return { user, repos, notes };
}

/** Текст ошибки без подробностей запроса: токен в него не попадает. */
export function describeError(err: unknown): string {
  if (err instanceof SourcecraftNotFoundError) return 'не найдено или нет доступа';
  if (err instanceof SourcecraftApiError) {
    if (err.status === 401) return 'токен не принят';
    if (err.status === 403) return 'нет прав';
    return `ошибка ${err.status}`;
  }
  return 'SourceCraft не ответил';
}
