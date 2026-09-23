import { describe, expect, it } from 'vitest';
import {
  contactHref,
  contactLabel,
  normalizeContact,
  parseContactLinks,
} from '../contacts';

describe('normalizeContact — что бы ни вставили, храним ник', () => {
  it('телеграм: ник, @ник и ссылка сводятся к одному', () => {
    for (const raw of ['durov', '@durov', 't.me/durov', 'https://t.me/durov', 'https://t.me/durov/']) {
      expect(normalizeContact('telegram', raw)).toBe('durov');
    }
  });

  it('вк понимает короткий адрес и ссылку', () => {
    expect(normalizeContact('vk', 'vk.com/id1234')).toBe('id1234');
    expect(normalizeContact('vk', 'https://vk.com/durov')).toBe('durov');
  });

  it('гитхаб понимает ссылку и имя', () => {
    expect(normalizeContact('github', 'https://github.com/octocat')).toBe('octocat');
    expect(normalizeContact('github', 'octocat')).toBe('octocat');
  });

  it('SourceCraft понимает оба домена', () => {
    expect(normalizeContact('sourcecraft', 'https://sourcecraft.dev/vladleonff')).toBe('vladleonff');
    expect(normalizeContact('sourcecraft', 'sourcecraft.tech/vladleonff')).toBe('vladleonff');
  });

  it('хвост после ника отбрасывается', () => {
    expect(normalizeContact('telegram', 'https://t.me/durov?start=1')).toBe('durov');
  });

  it('почта приводится к нижнему регистру', () => {
    expect(normalizeContact('email', '  Me@Example.COM ')).toBe('me@example.com');
    expect(normalizeContact('email', 'mailto:me@example.com')).toBe('me@example.com');
  });

  it('негодное — null, а не выдумка', () => {
    expect(normalizeContact('email', 'просто текст')).toBeNull();
    expect(normalizeContact('telegram', 'ab')).toBeNull(); // короче трёх символов
    expect(normalizeContact('github', 'с кириллицей')).toBeNull();
    expect(normalizeContact('vk', '')).toBeNull();
  });
});

describe('contactHref / contactLabel', () => {
  it('собирают ссылку по сети', () => {
    expect(contactHref({ kind: 'telegram', value: 'durov' })).toBe('https://t.me/durov');
    expect(contactHref({ kind: 'vk', value: 'durov' })).toBe('https://vk.com/durov');
    expect(contactHref({ kind: 'github', value: 'octocat' })).toBe('https://github.com/octocat');
    expect(contactHref({ kind: 'sourcecraft', value: 'me' })).toBe('https://sourcecraft.dev/me');
    expect(contactHref({ kind: 'email', value: 'me@example.com' })).toBe('mailto:me@example.com');
  });

  it('подпись: ник с собакой, почта как есть', () => {
    expect(contactLabel({ kind: 'telegram', value: 'durov' })).toBe('@durov');
    expect(contactLabel({ kind: 'email', value: 'me@example.com' })).toBe('me@example.com');
  });
});

describe('parseContactLinks — читаем jsonb бережно', () => {
  it('мусор даёт пустой список', () => {
    expect(parseContactLinks(null)).toEqual([]);
    expect(parseContactLinks('строка')).toEqual([]);
    expect(parseContactLinks([{ kind: 'myspace', value: 'x' }, 42, null])).toEqual([]);
  });

  it('повторы одной сети схлопываются, порядок фиксированный', () => {
    const links = parseContactLinks([
      { kind: 'email', value: 'me@example.com' },
      { kind: 'telegram', value: '@durov' },
      { kind: 'telegram', value: 'someone_else' },
    ]);
    expect(links).toEqual([
      { kind: 'telegram', value: 'durov' },
      { kind: 'email', value: 'me@example.com' },
    ]);
  });

  it('негодное значение выбрасывается, остальное остаётся', () => {
    const links = parseContactLinks([
      { kind: 'github', value: 'не ник' },
      { kind: 'vk', value: 'vk.com/durov' },
    ]);
    expect(links).toEqual([{ kind: 'vk', value: 'durov' }]);
  });
});
