import { describe, expect, it } from 'vitest';
import { findUserRole, isOwnerRole, parseOrgList, tokenSchema } from '../token-ownership';

describe('findUserRole', () => {
  const roles = [
    { subject: { type: 'team' as const, id: 'u1' }, role: 'admin' as const },
    { subject: { type: 'user' as const, id: 'u2' }, role: 'viewer' as const },
    { subject: { type: 'user' as const, id: 'u1' }, role: 'maintainer' as const },
  ];

  it('берёт роль именно пользователя, а не команды с тем же id', () => {
    expect(findUserRole(roles, 'u1')).toBe('maintainer');
    expect(findUserRole(roles, 'u2')).toBe('viewer');
    expect(findUserRole(roles, 'u3')).toBeNull();
  });
});

describe('isOwnerRole', () => {
  it('владельцы — admin и maintainer', () => {
    expect(isOwnerRole('admin')).toBe(true);
    expect(isOwnerRole('maintainer')).toBe(true);
    expect(isOwnerRole('developer')).toBe(false);
    expect(isOwnerRole(null)).toBe(false);
  });
});

describe('parseOrgList', () => {
  it('разбирает через запятую и пробел, снимает адреса и дубли', () => {
    expect(parseOrgList('acme, beta  https://sourcecraft.dev/gamma/repo acme')).toEqual([
      'acme',
      'beta',
      'gamma',
    ]);
  });

  it('отбрасывает мусор', () => {
    expect(parseOrgList('-bad, ok')).toEqual(['ok']);
    expect(parseOrgList('')).toEqual([]);
  });
});

describe('tokenSchema', () => {
  it('принимает токен и обрезает пробелы по краям', () => {
    expect(tokenSchema.parse('  abcdefghijkl  ')).toBe('abcdefghijkl');
  });

  it('отклоняет короткий и с пробелами внутри', () => {
    expect(tokenSchema.safeParse('abc').success).toBe(false);
    expect(tokenSchema.safeParse('abcdef ghijkl').success).toBe(false);
  });
});
