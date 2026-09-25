import { describe, expect, it } from 'vitest';
import { dayIn, findVerifyKey, generateVerifyKey, KEY_PREFIX } from '../ownership';

describe('generateVerifyKey', () => {
  it('префикс и 16 hex-символов, каждый раз новый', () => {
    const a = generateVerifyKey();
    const b = generateVerifyKey();
    expect(a).toMatch(new RegExp(`^${KEY_PREFIX}[0-9a-f]{16}$`));
    expect(a).not.toBe(b);
  });
});

describe('findVerifyKey', () => {
  const key = 'pulse-verify-0123456789abcdef';

  it('находит ключ в описании', () => {
    expect(findVerifyKey(key, `Мой проект. ${key}`, [])).toBe('description');
  });

  it('находит файл с именем ключа, с расширением и без', () => {
    expect(findVerifyKey(key, null, ['README.md', `${key}.txt`])).toBe('file');
    expect(findVerifyKey(key, null, [key])).toBe('file');
  });

  it('не принимает похожие имена и чужой ключ', () => {
    expect(findVerifyKey(key, 'pulse-verify-ffffffffffffffff', [`${key}x`, `a${key}`])).toBeNull();
    expect(findVerifyKey(key, undefined, [undefined, null])).toBeNull();
  });
});

describe('dayIn', () => {
  it('сутки считаются по часовому поясу пересчёта', () => {
    // 21:30 UTC — в Москве уже 00:30 следующего дня.
    const date = new Date('2026-09-25T21:30:00Z');
    expect(dayIn(date, 'UTC')).toBe('2026-09-25');
    expect(dayIn(date, 'Europe/Moscow')).toBe('2026-09-26');
  });
});
