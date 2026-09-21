// Чистая функция генерации SVG-бейджа Pulse.
//
// Бейдж живёт в чужом README, поэтому он: без внешних шрифтов, без скриптов,
// одним файлом и в той же чёрно-белой палитре, что и сайт.
//
// Оценку показываем дважды — числом и длиной полосы. Раньше было только число
// в плашке: «74» ни о чём не говорит, пока не знаешь шкалу. Полоса даёт
// ответ сразу, а подпись «/100» закрепляет её.
//
// Функция вынесена в отдельный файл ради Vitest-теста.

export type BadgeInput = {
  score: number | null;
  /** Подпись слева, например «pulse». */
  label?: string;
};

const WIDTH = 168;
const HEIGHT = 28;
const PLATE = 74;
const RADIUS = 6;

/** Дорожка под полосу прогресса. */
const TRACK_X = PLATE + 12;
const TRACK_Y = 21;
const TRACK_W = WIDTH - TRACK_X - 12;
const TRACK_H = 3.5;

const INK = '#1D1D1F';
const PAPER = '#FFFFFF';
const LINE = '#E5E5E5';
const LINE_2 = '#D4D4D4';
const MUTED = '#8A8A8E';

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Segoe UI, Arial, sans-serif";

/**
 * Возвращает валидный SVG-документ: слева тёмная плашка с планетой и
 * подписью, справа оценка и полоса на всю ширину шкалы. Нет оценки — прочерк
 * и пустая дорожка.
 */
export function renderBadgeSvg(input: BadgeInput): string {
  const label = escapeXml(input.label ?? 'pulse');
  const score =
    input.score === null ? null : Math.max(0, Math.min(100, Math.round(input.score)));
  const value = score === null ? '—' : String(score);
  const fillW = score === null ? 0 : Math.round((TRACK_W * score) / 100);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${label}: ${value} из 100">`,
    `<title>${label}: ${value} из 100</title>`,
    `<clipPath id="r"><rect width="${WIDTH}" height="${HEIGHT}" rx="${RADIUS}"/></clipPath>`,
    `<g clip-path="url(#r)">`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}"/>`,
    `<rect width="${PLATE}" height="${HEIGHT}" fill="${INK}"/>`,
    // Планета: тот же знак, что и логотип сайта, только неподвижный.
    `<g transform="translate(16 14)">`,
    `<ellipse rx="10" ry="3.6" fill="none" stroke="${PAPER}" stroke-width="1" opacity="0.4" transform="rotate(-18)"/>`,
    `<circle r="6.4" fill="none" stroke="${PAPER}" stroke-width="1.3"/>`,
    `<path d="M-6 -2 Q0 -3.6 6 -2 M-6 2.4 Q0 4 6 2.4" fill="none" stroke="${PAPER}" stroke-width="0.9" opacity="0.55"/>`,
    `<circle cx="-2.2" cy="-0.4" r="1.9" fill="${PAPER}" opacity="0.8"/>`,
    `</g>`,
    `<g font-family="${FONT}">`,
    `<text x="30" y="18" fill="${PAPER}" font-size="11" font-weight="600">${label}</text>`,
    `<text x="${TRACK_X}" y="16" fill="${INK}" font-size="15" font-weight="700">${value}</text>`,
    `<text x="${TRACK_X + (score === null ? 14 : String(value).length * 9 + 2)}" y="16" fill="${MUTED}" font-size="10" font-weight="600">/100</text>`,
    `</g>`,
    `<rect x="${TRACK_X}" y="${TRACK_Y}" width="${TRACK_W}" height="${TRACK_H}" rx="${TRACK_H / 2}" fill="${LINE}"/>`,
    fillW > 0
      ? `<rect x="${TRACK_X}" y="${TRACK_Y}" width="${fillW}" height="${TRACK_H}" rx="${TRACK_H / 2}" fill="${INK}"/>`
      : '',
    `</g>`,
    `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="${RADIUS}" fill="none" stroke="${LINE_2}"/>`,
    `</svg>`,
  ].join('');
}

/** Подпись приходит из URL — в разметку она попадает только экранированной. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
