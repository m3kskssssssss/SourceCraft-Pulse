import { describe, expect, it } from 'vitest';
import { currentSlotStart, nextSlotStart } from '../commit-slots';

describe('окна проверки коммитов', () => {
  it('до полудня по Москве — окно с полуночи', () => {
    // 29.09 08:30 МСК = 05:30 UTC → окно с 00:00 МСК = 28.09 21:00 UTC
    const now = new Date('2026-09-29T05:30:00Z');
    expect(currentSlotStart(now).toISOString()).toBe('2026-09-28T21:00:00.000Z');
    expect(nextSlotStart(now).toISOString()).toBe('2026-09-29T09:00:00.000Z');
  });

  it('после полудня по Москве — окно с 12:00', () => {
    const now = new Date('2026-09-29T15:00:00Z'); // 18:00 МСК
    expect(currentSlotStart(now).toISOString()).toBe('2026-09-29T09:00:00.000Z');
    expect(nextSlotStart(now).toISOString()).toBe('2026-09-29T21:00:00.000Z');
  });

  it('ровно на границе окно начинается сейчас', () => {
    const now = new Date('2026-09-29T09:00:00Z'); // 12:00 МСК
    expect(currentSlotStart(now).toISOString()).toBe('2026-09-29T09:00:00.000Z');
  });
});
