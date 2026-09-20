import { describe, expect, it } from 'vitest';
import { renderBadgeSvg } from '../badge';

describe('renderBadgeSvg', () => {
  it('содержит корректный XML-заголовок и aria-label', () => {
    const svg = renderBadgeSvg({ score: 82 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('aria-label="pulse: 82"');
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

  it('использует чёрно-белую палитру (нет цветовых hex)', () => {
    const svg = renderBadgeSvg({ score: 50 });
    // Разрешённые цвета: #1D1D1F, #F5F5F7, #FFFFFF, none
    expect(svg).toMatch(/#1D1D1F/);
    expect(svg).toMatch(/#F5F5F7/);
    expect(svg).toMatch(/#FFFFFF/);
    // Никаких зелёных/красных — их не должно быть в палитре.
    expect(svg).not.toMatch(/#00[0-9a-fA-F]{4}[a-fA-F]/); // грубый детектор нетёмных цветов
  });
});
