import { describe, expect, it } from 'vitest';
import { renderBadgeSvg } from '../badge';
import { renderBadgeCardSvg } from '../badge-card';
import { EMPTY_CATEGORY_VALUES } from '../category-meta';

const card = renderBadgeCardSvg({
  org: 'acme',
  repo: 'rocket',
  score: 70,
  categories: EMPTY_CATEGORY_VALUES,
  language: null,
  updated: null,
  verified: false,
});
const small = renderBadgeSvg({ score: 70 });

describe('общий вид бейджей', () => {
  it.each([
    ['маленький', small],
    ['карточка', card],
  ])('%s: «Pulse» с большой буквы, чистый чёрный, без обводки', (_name, svg) => {
    expect(svg).toContain('>Pulse<');
    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toMatch(/<rect[^>]*stroke=/);
  });

  it.each([
    ['маленький', small],
    ['карточка', card],
  ])('%s: логотип вращается — меридианы анимированы', (_name, svg) => {
    const animations = svg.match(/<animate attributeName="rx"[^>]*repeatCount="indefinite"/g) ?? [];
    expect(animations.length).toBe(4);
  });
});
