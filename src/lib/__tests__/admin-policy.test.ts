import { describe, expect, it } from 'vitest';
import { checkAdminLoginPolicy, checkAdminPasswordPolicy } from '../admin-policy';

describe('checkAdminLoginPolicy', () => {
  it('запрещает admin/root/administrator в любом регистре', () => {
    for (const bad of ['admin', 'Admin', 'ROOT', 'Administrator']) {
      expect(checkAdminLoginPolicy(bad).ok).toBe(false);
    }
  });

  it('слишком короткий/длинный логин — отказ', () => {
    expect(checkAdminLoginPolicy('abc').ok).toBe(false);
    expect(checkAdminLoginPolicy('a'.repeat(65)).ok).toBe(false);
  });

  it('нормальный логин проходит', () => {
    expect(checkAdminLoginPolicy('captain-obvious').ok).toBe(true);
  });
});

describe('checkAdminPasswordPolicy', () => {
  it('меньше 20 символов — отказ', () => {
    expect(checkAdminPasswordPolicy('short').ok).toBe(false);
    expect(checkAdminPasswordPolicy('a'.repeat(19)).ok).toBe(false);
  });

  it('ровно 20 — ок', () => {
    expect(checkAdminPasswordPolicy('a'.repeat(20)).ok).toBe(true);
  });
});
