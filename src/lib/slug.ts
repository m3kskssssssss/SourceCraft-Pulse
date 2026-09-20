// Валидация и парсинг адреса репозитория org/repo.
//
// Правила по документации SourceCraft (наблюдаемо + аналогично GitLab-like):
//   - латиница, цифры, дефис, подчёркивание, точка
//   - первый символ не может быть дефисом/точкой/подчёркиванием
//   - длина 1..100
//
// Экспорт: parseSlug(target) — строгий парсер, возвращает {org, repo} либо кидает.

const SEGMENT = /^[a-z0-9][a-z0-9._-]{0,99}$/i;

export type OrgRepo = { org: string; repo: string };

export class InvalidSlugError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'InvalidSlugError';
  }
}

/**
 * Разбирает вход вроде «org/repo» и валидирует каждую часть регуляркой.
 * Пробелы вокруг не важны; регистр сохраняется (SourceCraft различает case).
 */
export function parseSlug(target: string): OrgRepo {
  if (typeof target !== 'string') {
    throw new InvalidSlugError('Ожидалась строка вида org/repo');
  }
  const trimmed = target.trim();
  if (!trimmed) throw new InvalidSlugError('Пустой ввод');

  // Убираем ведущий https:// и типичные префиксы, чтобы пользователь мог
  // вставить и адрес страницы репо: sourcecraft.tech/org/repo или https://…
  const clean = trimmed
    .replace(/^https?:\/\/[^/]+\/?/i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');

  const parts = clean.split('/').filter(Boolean);
  if (parts.length !== 2) {
    throw new InvalidSlugError(`Ожидался формат «org/repo», получено «${target}»`);
  }
  const [org, repo] = parts as [string, string];
  if (!SEGMENT.test(org)) throw new InvalidSlugError(`Некорректный org: «${org}»`);
  if (!SEGMENT.test(repo)) throw new InvalidSlugError(`Некорректный repo: «${repo}»`);
  return { org, repo };
}

/** Мягкая проверка без исключений — удобна в формах. */
export function tryParseSlug(target: string): OrgRepo | null {
  try {
    return parseSlug(target);
  } catch {
    return null;
  }
}
