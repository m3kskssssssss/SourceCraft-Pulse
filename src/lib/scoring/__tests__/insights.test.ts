import { describe, expect, it } from 'vitest';
import { recommendationPriority, strengthsAndWeaknesses } from '../insights';
import type { CategoryScore } from '../types';

const categories = [
  {
    key: 'docs',
    value: 60,
    appliedWeightSum: 1,
    metrics: [
      { key: 'docs.readme', category: 'docs', weight: 0.5, value: 95, hint: 'README подробный' },
      { key: 'docs.license', category: 'docs', weight: 0.2, value: 0, hint: 'LICENSE нет' },
      { key: 'docs.changelog', category: 'docs', weight: 0.1, value: null, unknown: true },
    ],
  },
  { key: 'security', value: null, appliedWeightSum: 0, metrics: [] },
] as unknown as CategoryScore[];

describe('strengthsAndWeaknesses', () => {
  it('делит измеренные метрики на сильные и слабые', () => {
    const { strengths, weaknesses } = strengthsAndWeaknesses(categories);
    expect(strengths.map((s) => s.key)).toEqual(['docs.readme']);
    expect(weaknesses.map((s) => s.key)).toEqual(['docs.license']);
  });

  it('«нет данных» не считает слабостью', () => {
    const { weaknesses } = strengthsAndWeaknesses(categories);
    expect(weaknesses.some((w) => w.key === 'docs.changelog')).toBe(false);
  });
});

describe('recommendationPriority', () => {
  it('безопасность — всегда высокий', () => {
    expect(recommendationPriority({ category: 'security', gain: 0.5 })).toBe('high');
  });

  it('остальное — по приросту', () => {
    expect(recommendationPriority({ category: 'docs', gain: 6 })).toBe('high');
    expect(recommendationPriority({ category: 'docs', gain: 3 })).toBe('medium');
    expect(recommendationPriority({ category: 'docs', gain: 1 })).toBe('low');
  });
});
