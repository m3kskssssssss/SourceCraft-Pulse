import { describe, expect, it } from 'vitest';
import { summarizeCiRuns } from '../collect';

describe('summarizeCiRuns', () => {
  it('считает успешные и упавшие, последний — по дате', () => {
    const facts = summarizeCiRuns([
      { status: 'success', dates: { created_at: '2026-09-20T10:00:00Z' } },
      { status: 'failed', dates: { created_at: '2026-09-25T10:00:00Z' } },
      { status: 'timeout', dates: { created_at: '2026-09-21T10:00:00Z' } },
      { status: 'canceled', dates: { created_at: '2026-09-22T10:00:00Z' } },
    ]);
    expect(facts.available).toBe(true);
    expect(facts.sampled).toBe(4);
    expect(facts.succeeded).toBe(1);
    expect(facts.failed).toBe(2);
    expect(facts.other).toBe(1);
    expect(facts.lastStatus).toBe('failed');
    expect(facts.lastRunAt).toBe('2026-09-25T10:00:00Z');
  });

  it('нет прогонов — данные есть, но пустые', () => {
    const facts = summarizeCiRuns([]);
    expect(facts.available).toBe(true);
    expect(facts.sampled).toBe(0);
    expect(facts.reason).toBe('no_runs');
  });
});
