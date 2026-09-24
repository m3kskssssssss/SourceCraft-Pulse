// Вход через Яндекс ID: находим или заводим пользователя и забираем из
// Яндекса то, что он отдаёт по разрешённым scope — почту, имя, отображаемое
// имя и фото. Работает только в Node-рантайме (драйвер базы, fetch фото).
//
// Правила:
//   - ищем сначала по связке provider + providerId, потом по почте: если
//     человек уже регистрировался паролем с той же почтой, это тот же
//     аккаунт, и мы привязываем к нему Яндекс;
//   - заполняем только пустые поля: ник, ФИО и фото, выставленные на Pulse
//     руками, Яндекс не перетирает;
//   - заблокированного пользователя не пускаем.

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { users } from '@/db/schema';

const PROVIDER = 'yandex';
const MAX_AVATAR_BYTES = 256 * 1024;
const AVATAR_MIME = ['image/png', 'image/jpeg', 'image/webp'];

/** Поля ответа login.yandex.ru/info, которые нам нужны. Остальное не храним. */
const yandexProfileSchema = z.object({
  id: z.string().min(1),
  login: z.string().optional(),
  default_email: z.string().email().optional(),
  emails: z.array(z.string()).optional(),
  display_name: z.string().optional(),
  real_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  default_avatar_id: z.string().optional(),
  is_avatar_empty: z.boolean().optional(),
});

export type YandexUser = { id: string; role: 'user' | 'admin'; blocked: boolean };

export async function upsertYandexUser(raw: unknown): Promise<YandexUser | null> {
  const parsed = yandexProfileSchema.safeParse(raw);
  if (!parsed.success) return null;
  const p = parsed.data;

  const email = (p.default_email ?? p.emails?.find((e) => e.includes('@')))?.toLowerCase() ?? null;
  const realName = clean(p.real_name) ?? clean([p.first_name, p.last_name].filter(Boolean).join(' '));
  // Отображаемое имя в Яндексе человек выбирает сам — это и есть его ник.
  // Логин не берём: он бывает техническим и совпадает с почтой.
  const nickname = clean(p.display_name)?.slice(0, 40) ?? null;

  const byProvider = await db.query.users.findFirst({
    where: and(eq(users.provider, PROVIDER), eq(users.providerId, p.id)),
  });
  const byEmail = !byProvider && email ? await db.query.users.findFirst({ where: eq(users.email, email) }) : null;
  const existing = byProvider ?? byEmail;

  if (existing) {
    const patch: Partial<typeof users.$inferInsert> = {};
    if (!existing.providerId) {
      patch.provider = PROVIDER;
      patch.providerId = p.id;
    }
    if (!existing.name && realName) patch.name = realName;
    if (!existing.nickname && nickname) patch.nickname = nickname;
    if (!existing.avatarMime) Object.assign(patch, await fetchAvatar(p));
    if (Object.keys(patch).length > 0) await db.update(users).set(patch).where(eq(users.id, existing.id));
    return { id: existing.id, role: existing.role, blocked: Boolean(existing.blockedAt) };
  }

  // Почту Яндекс отдаёт, только если человек разрешил её показать. Без неё
  // заводим служебный адрес: поле обязательное и уникальное, а войти этим
  // адресом всё равно нельзя — пароля у такого аккаунта нет.
  const [created] = await db
    .insert(users)
    .values({
      email: email ?? `yandex-${p.id}@users.noreply.pulse`,
      name: realName,
      nickname,
      provider: PROVIDER,
      providerId: p.id,
      role: 'user',
      ...(await fetchAvatar(p)),
    })
    .returning({ id: users.id, role: users.role });
  return created ? { id: created.id, role: created.role, blocked: false } : null;
}

/** Фото из Яндекса в том же виде, что загруженное руками: байты и тип. */
async function fetchAvatar(
  p: z.infer<typeof yandexProfileSchema>,
): Promise<{ avatarData?: Buffer; avatarMime?: string; avatarUpdatedAt?: Date }> {
  if (p.is_avatar_empty || !p.default_avatar_id) return {};
  try {
    const res = await fetch(`https://avatars.yandex.net/get-yapic/${encodeURIComponent(p.default_avatar_id)}/islands-200`, {
      signal: AbortSignal.timeout(5000),
    });
    const mime = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    if (!res.ok || !AVATAR_MIME.includes(mime)) return {};
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_AVATAR_BYTES) return {};
    return { avatarData: bytes, avatarMime: mime, avatarUpdatedAt: new Date() };
  } catch {
    // Без фото вход всё равно должен пройти.
    return {};
  }
}

function clean(value: string | undefined | null): string | null {
  const v = value?.trim();
  return v ? v : null;
}
