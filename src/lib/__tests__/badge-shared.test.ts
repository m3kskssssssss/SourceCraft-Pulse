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
  ])('%s: логотип вращается — три анимированных меридиана', (_name, svg) => {
    const animations = svg.match(/<animate attributeName="rx"[^>]*repeatCount="indefinite"/g) ?? [];
    expect(animations.length).toBe(3);
  });
});

describe('фон без светлой каймы на тёмной теме', () => {
  it.each([
    ['маленький', small],
    ['карточка', card],
  ])('%s: без clipPath и без светлого прямоугольника под плашкой', (_name, svg) => {
    expect(svg).not.toContain('clipPath');
    // Фон — два пути: чёрная плашка и светлая часть, которые не перекрываются.
    const paths = svg.match(/<path d="M[^"]+" fill="#(000000|F5F5F5)"\/>/g) ?? [];
    expect(paths).toHaveLength(2);
    expect(svg).not.toMatch(/<rect width="\d+" height="\d+" fill="#F5F5F5"/);
  });
});
