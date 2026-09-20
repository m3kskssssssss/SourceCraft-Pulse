// Чистая функция генерации SVG-бейджа Pulse.
// Чёрно-белая палитра, никаких внешних шрифтов — используется системный.
// Функция вынесена в отдельный файл ради Vitest-теста.

export type BadgeInput = {
  score: number | null;
  /** Подпись слева, например «pulse». */
  label?: string;
};

/**
 * Возвращает валидный SVG-документ с прямоугольником-бейджем.
 * Размеры фиксированные: 116×20. Слева тёмная плашка с подписью,
 * справа светлая с оценкой. Если оценки нет — прочерк.
 */
export function renderBadgeSvg(input: BadgeInput): string {
  const label = input.label ?? 'pulse';
  const value = input.score === null ? '—' : String(Math.max(0, Math.min(100, Math.round(input.score))));

  const labelWidth = 62;
  const valueWidth = 54;
  const height = 20;
  const totalWidth = labelWidth + valueWidth;

  const font =
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";

  // aria-label — важен для доступности.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">`,
    `<title>${label}: ${value}</title>`,
    `<rect x="0" y="0" width="${labelWidth}" height="${height}" fill="#1D1D1F"/>`,
    `<rect x="${labelWidth}" y="0" width="${valueWidth}" height="${height}" fill="#F5F5F7"/>`,
    `<rect x="0" y="0" width="${totalWidth}" height="${height}" fill="none" stroke="#1D1D1F" stroke-width="0.5"/>`,
    `<g font-family="${font}" font-size="11" font-weight="600">`,
    `<text x="${labelWidth / 2}" y="14" fill="#FFFFFF" text-anchor="middle">${label}</text>`,
    `<text x="${labelWidth + valueWidth / 2}" y="14" fill="#1D1D1F" text-anchor="middle">${value}</text>`,
    `</g>`,
    `</svg>`,
  ].join('');
}
