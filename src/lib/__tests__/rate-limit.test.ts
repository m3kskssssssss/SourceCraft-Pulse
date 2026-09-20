import { describe, expect, it, beforeEach } from 'vitest';
import { rateLimit, resetRateLimitForTesting } from '../rate-limit';

beforeEach(() => resetRateLimitForTesting());

describe('rateLimit', () => {
  it('пропускает первые N запросов', () => {
    const now = 0;
    for (let i = 0; i < 5; i += 1) {
      const r = rateLimit('k', 5, 1000, now + i);
      expect(r.allowed).toBe(true);
    }
    const blocked = rateLimit('k', 5, 1000, now + 5);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('окно сбрасывается по истечении windowMs', () => {
    rateLimit('k', 1, 1000, 0);
    expect(rateLimit('k', 1, 1000, 500).allowed).toBe(false);
    expect(rateLimit('k', 1, 1000, 1001).allowed).toBe(true);
  });

  it('разные ключи независимы', () => {
    rateLimit('a', 1, 1000, 0);
    expect(rateLimit('a', 1, 1000, 100).allowed).toBe(false);
    expect(rateLimit('b', 1, 1000, 100).allowed).toBe(true);
  });
});
