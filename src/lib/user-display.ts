// Как показывать пользователя. Без единого запроса к базе — иначе этот файл
// не смог бы импортировать браузерный код, а имя и инициалы нужны и аватару
// в шапке, и подписи под комментарием.
//
// Имя выбирается по цепочке: ник → ФИО → логин. Логином здесь служит часть
// почты до собаки: полный адрес — это контакт, а не подпись, и выкладывать
// его всем читателям ленты незачем.

import type { ContactLink } from './contacts';

export type PublicUser = {
  id: string;
  /** Как подписывать: ник, иначе ФИО, иначе логин. */
  displayName: string;
  nickname: string | null;
  name: string | null;
  bio: string | null;
  /** Контакты по сетям: телеграм, вк, гитхаб, SourceCraft, почта. */
  contacts: ContactLink[];
  /** Строки из прежнего свободного поля, пока их не заменили. */
  legacyContacts: string[];
  /** Есть ли загруженное фото — от этого зависит, рисовать ли заглушку. */
  hasAvatar: boolean;
  /** Метка версии фото: без неё браузер держит старое после замены. */
  avatarVersion: string | null;
  createdAt: string;
};

export function displayNameOf(row: {
  nickname?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const nickname = row.nickname?.trim();
  if (nickname) return nickname;
  const name = row.name?.trim();
  if (name) return name;
  const email = row.email?.trim() ?? '';
  const login = email.split('@')[0];
  return login || 'Пользователь';
}

/** Контакты хранятся одной строкой; наружу — уже разобранный список. */
export function splitContacts(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Две буквы для заглушки аватара. Берём первые буквы двух слов имени, иначе
 * первую букву одного. Кириллица и латиница одинаково годятся.
 */
export function initialsOf(displayName: string): string {
  const words = displayName.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
