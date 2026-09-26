import { describe, expect, it } from 'vitest';
import { renderBadgeCardSvg, type BadgeCardInput } from '../badge-card';

const base: BadgeCardInput = {
  org: 'acme',
  repo: 'rocket',
  score: 82,
  categories: { activity: 70, code: 90, security: null, docs: 55, ci: 100, issues: 40 },
  language: 'TypeScript',
  updated: '25.09.2026',
  verified: true,
};

describe('renderBadgeCardSvg', () => {
  it('балл, слаг и подпись для экранных читалок', () => {
    const svg = renderBadgeCardSvg(base);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('aria-label="Pulse acme/rocket: 82 из 100"');
    expect(svg).toContain('>82<');
    expect(svg).toContain('>acme/rocket<');
  });

  it('шесть категорий, пустая — прочерком', () => {
    const svg = renderBadgeCardSvg(base);
    for (const title of ['Безопасность', 'Код', 'Активность', 'Документация', 'CI/CD', 'Задачи']) {
      expect(svg).toContain(`>${title}<`);
    }
    expect(svg).toContain('>—<');
  });

  it('подвал: язык, дата и отметка владельца', () => {
    const svg = renderBadgeCardSvg(base);
    expect(svg).toContain('TypeScript · обновлено 25.09.2026 · ✓ владелец');
    expect(renderBadgeCardSvg({ ...base, verified: false })).not.toContain('владелец');
  });

  it('без балла пишет пояснение', () => {
    const svg = renderBadgeCardSvg({ ...base, score: null, note: 'не опубликован' });
    expect(svg).toContain('>не опубликован<');
  });

  it('экранирует разметку', () => {
    const svg = renderBadgeCardSvg({ ...base, language: '<script>' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
});
