import { describe, expect, it } from 'vitest';
import { renderBadgeSvg } from '../badge';

describe('renderBadgeSvg', () => {
  it('содержит корректный XML-заголовок и aria-label', () => {
    const svg = renderBadgeSvg({ score: 82 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('aria-label="pulse: 82 из 100"');
    expect(svg).toContain('>82<');
  });

  it('null score рендерится как прочерк', () => {
    const svg = renderBadgeSvg({ score: null });
    expect(svg).toContain('>—<');
  });

  it('число зажимается в 0..100', () => {
    expect(renderBadgeSvg({ score: 150 })).toContain('>100<');
    expect(renderBadgeSvg({ score: -5 })).toContain('>0<');
  });

  it('пользовательский label уходит в текст', () => {
    const svg = renderBadgeSvg({ score: 50, label: 'health' });
    expect(svg).toContain('>health<');
  });

  it('использует только серые цвета', () => {
    const svg = renderBadgeSvg({ score: 50 });
    const hexes = svg.match(/#[0-9A-Fa-f]{6}/g) ?? [];
    expect(hexes.length).toBeGreaterThan(0);
    for (const hex of hexes) {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
      // Серый — это когда каналы почти равны. Цветного в палитре быть не должно.
      expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeLessThanOrEqual(6);
    }
  });

  it('полоса прогресса длиной с оценку', () => {
    const empty = renderBadgeSvg({ score: 0 });
    const half = renderBadgeSvg({ score: 50 });
    const full = renderBadgeSvg({ score: 100 });
    const fillWidth = (svg: string): number => {
      // Вторая дорожка в разметке — заполненная часть.
      const widths = [...svg.matchAll(/<rect x="86" y="[\d.]+" width="([\d.]+)"/g)].map((m) =>
        Number(m[1]),
      );
      return widths[1] ?? 0;
    };
    expect(fillWidth(empty)).toBe(0);
    expect(fillWidth(half)).toBeGreaterThan(0);
    expect(fillWidth(full)).toBeGreaterThan(fillWidth(half));
  });

  it('подпись экранируется', () => {
    const svg = renderBadgeSvg({ score: 10, label: '<script>' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('без оценки печатает пояснение вместо прочерка', () => {
    const svg = renderBadgeSvg({ score: null, note: 'не опубликован' });
    expect(svg).toContain('>не опубликован<');
    expect(svg).not.toContain('>/100<');
    expect(svg).toContain('aria-label="pulse: не опубликован"');
  });

  it('пояснение тоже экранируется', () => {
    const svg = renderBadgeSvg({ score: null, note: '<b>' });
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('&lt;b&gt;');
  });
});
