// Контакты профиля: пять известных сетей вместо свободного текста.
//
// Без БД — этот файл читают и форма в браузере, и страница профиля, и
// серверное действие. Хранится всё как массив `{kind, value}` в jsonb;
// value — всегда нормализованный хвост (ник или почта), а не то, что
// вставил пользователь. Так ссылку можно собрать один раз и одинаково.

export const CONTACT_KINDS = ['telegram', 'vk', 'github', 'sourcecraft', 'email'] as const;

export type ContactKind = (typeof CONTACT_KINDS)[number];

export type ContactLink = { kind: ContactKind; value: string };

export const CONTACT_META: Record<
  ContactKind,
  {
    /** Название сети в интерфейсе. */
    title: string;
    /** Две буквы на значке. Настоящих логотипов не берём: тема чёрно-белая,
     *  а чужие фирменные знаки тянут за собой свои правила использования. */
    badge: string;
    placeholder: string;
    /** Подсказка под полем: что именно вставлять. */
    hint: string;
  }
> = {
  telegram: {
    title: 'Telegram',
    badge: 'TG',
    placeholder: '@durov или t.me/durov',
    hint: 'Ник или ссылка — приведём к одному виду.',
  },
  vk: {
    title: 'ВКонтакте',
    badge: 'VK',
    placeholder: 'id1 или vk.com/id1',
    hint: 'Короткий адрес страницы.',
  },
  github: {
    title: 'GitHub',
    badge: 'GH',
    placeholder: 'octocat или github.com/octocat',
    hint: 'Имя пользователя.',
  },
  sourcecraft: {
    title: 'SourceCraft',
    badge: 'SC',
    placeholder: 'username или sourcecraft.dev/username',
    hint: 'Тот же слаг, что и в адресе ваших репозиториев.',
  },
  email: {
    title: 'Почта',
    badge: '@',
    placeholder: 'you@example.com',
    hint: 'Будет видна всем, кто откроет профиль.',
  },
};

/** Порядок вывода в профиле: сначала мессенджеры, почта — последней. */
export const CONTACT_ORDER: ContactKind[] = [
  'telegram',
  'vk',
  'github',
  'sourcecraft',
  'email',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Что срезаем с начала, прежде чем проверять ник. */
const PREFIXES: Record<ContactKind, string[]> = {
  telegram: ['https://t.me/', 'http://t.me/', 't.me/', 'telegram.me/', '@'],
  vk: ['https://vk.com/', 'http://vk.com/', 'vk.com/', 'https://m.vk.com/', '@'],
  github: ['https://github.com/', 'http://github.com/', 'github.com/', '@'],
  sourcecraft: [
    'https://sourcecraft.dev/',
    'http://sourcecraft.dev/',
    'sourcecraft.dev/',
    'https://sourcecraft.tech/',
    'sourcecraft.tech/',
    '@',
  ],
  email: ['mailto:'],
};

const HANDLE_RE: Record<Exclude<ContactKind, 'email'>, RegExp> = {
  telegram: /^[A-Za-z0-9_]{3,32}$/,
  vk: /^[A-Za-z0-9_.]{3,64}$/,
  github: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/,
  sourcecraft: /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/,
};

/**
 * Приводит введённое к хранимому виду. null — не разобрали; вызывающий сам
 * решает, ругаться или молча пропустить.
 */
export function normalizeContact(kind: ContactKind, raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  for (const prefix of PREFIXES[kind]) {
    if (value.toLowerCase().startsWith(prefix)) {
      value = value.slice(prefix.length);
      break;
    }
  }
  // Хвост после ника: ?utm=… или слэш в конце скопированной ссылки.
  value = value.split(/[?#]/)[0] ?? '';
  value = value.replace(/\/+$/, '');

  if (kind === 'email') {
    const email = value.toLowerCase();
    return EMAIL_RE.test(email) ? email : null;
  }

  return HANDLE_RE[kind].test(value) ? value : null;
}

/** Куда ведёт ссылка. */
export function contactHref(link: ContactLink): string {
  switch (link.kind) {
    case 'telegram':
      return `https://t.me/${link.value}`;
    case 'vk':
      return `https://vk.com/${link.value}`;
    case 'github':
      return `https://github.com/${link.value}`;
    case 'sourcecraft':
      // Владелец в адресе репозитория и есть слаг профиля: страница репо уже
      // собирается как sourcecraft.dev/<org>/<repo>.
      return `https://sourcecraft.dev/${link.value}`;
    case 'email':
      return `mailto:${link.value}`;
  }
}

/** Что написано на ссылке. */
export function contactLabel(link: ContactLink): string {
  return link.kind === 'email' ? link.value : `@${link.value}`;
}

/**
 * Разбирает то, что лежит в jsonb. Данные писали мы сами, но в базе это всё
 * равно unknown — на любой мусор отвечаем пустым списком.
 */
export function parseContactLinks(raw: unknown): ContactLink[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<ContactKind>();
  const links: ContactLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const kind = (item as { kind?: unknown }).kind;
    const value = (item as { value?: unknown }).value;
    if (typeof kind !== 'string' || typeof value !== 'string') continue;
    if (!isContactKind(kind) || seen.has(kind)) continue;
    const normalized = normalizeContact(kind, value);
    if (!normalized) continue;
    seen.add(kind);
    links.push({ kind, value: normalized });
  }
  return sortContacts(links);
}

export function isContactKind(value: string): value is ContactKind {
  return (CONTACT_KINDS as readonly string[]).includes(value);
}

export function sortContacts(links: ContactLink[]): ContactLink[] {
  return [...links].sort(
    (a, b) => CONTACT_ORDER.indexOf(a.kind) - CONTACT_ORDER.indexOf(b.kind),
  );
}
