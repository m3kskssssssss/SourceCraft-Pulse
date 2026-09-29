import { describe, expect, it } from 'vitest';
import { summarizeReviews } from '../reviews';

const now = new Date('2026-09-29T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

describe('summarizeReviews', () => {
  it('считает ревью только не автора и отделяет AppSec', () => {
    const prs = [
      { slug: '1', author: { slug: 'ann' }, created_at: hoursAgo(50), status: 'merged' },
      { slug: '2', author: { slug: 'bob' }, created_at: hoursAgo(24 * 10), status: 'open' },
    ] as never[];
    const comments = new Map([
      [
        '1',
        [
          { author: { slug: 'ann' }, created_at: hoursAgo(49) }, // автор — не ревью
          { author: { slug: 'kim' }, created_at: hoursAgo(40), is_outdated: true },
          { author: { slug: 'kim' }, created_at: hoursAgo(30) },
          { type: 'appsec', created_at: hoursAgo(45) },
        ],
      ],
    ]) as never;
    const s = summarizeReviews(prs, comments, now);
    expect(s.available).toBe(true);
    if (!s.available) return;
    expect(s.sampledPrs).toBe(2);
    expect(s.reviewedPrs).toBe(1);
    expect(s.reviewComments).toBe(2);
    expect(s.medianFirstReviewHours).toBe(10);
    expect(s.outdatedSharePercent).toBe(50);
    expect(s.appsecComments).toBe(1);
    expect(s.waitingPrs).toBe(1); // открыт 10 дней без ревью
    expect(s.topReviewers).toEqual([{ slug: 'kim', comments: 2 }]);
  });

  it('без PR — пустая сводка, а не ошибка', () => {
    const s = summarizeReviews([], new Map(), now);
    expect(s).toMatchObject({ available: true, sampledPrs: 0, reviewedPrs: 0, medianFirstReviewHours: null });
  });
});
