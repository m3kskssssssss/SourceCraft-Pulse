// Чистая функция генерации маленького SVG-бейджа Pulse.
//
// Оценку показываем дважды — числом и длиной полосы: «74» ни о чём не
// говорит, пока не знаешь шкалу, полоса даёт ответ сразу, «/100» закрепляет.
//
// Сетка: высота 28, поля PAD со всех сторон. Слева чёрная плашка —
// вращающийся глобус и «Pulse», справа на светлом фоне число и полоса.
// Обводки нет: форму держат сами плашки.
//
// Палитра, логотип и экранирование — общие с карточкой (badge-shared.ts).
// Функция вынесена в отдельный файл ради Vitest-теста.

import {
  BRAND,
  FONT,
  INK,
  MUTED,
  PANEL,
  PAPER,
  TRACK,
  escapeXml,
  planetSvg,
  textWidth,
} from './badge-shared';

export type BadgeInput = {
  score: number | null;
  /** Подпись на плашке, по умолчанию «Pulse». */
  label?: string;
  /**
   * Что написать вместо числа, когда оценки нет: «не опубликован», «нет
   * оценки». Прочерк сам по себе выглядит как сломанная картинка.
   */
  note?: string;
};

const HEIGHT = 28;
const RADIUS = 6;
/** Поле от края бейджа и между плашкой и содержимым справа. */
const PAD = 10;
const LOGO_R = 7;
/** Зазор между логотипом и подписью. */
const GAP = 6;
const LABEL_FONT = 11;
const SCORE_FONT = 14;
const NOTE_FONT = 10;
const TRACK_H = 3;
/** Минимальная ширина правой части: полоса короче не читается как шкала. */
const RIGHT_MIN = 64;

/**
 * Возвращает валидный SVG-документ: слева плашка с логотипом, справа оценка
 * и полоса на всю ширину шкалы. Нет оценки — пояснение и пустая дорожка.
 */
export function renderBadgeSvg(input: BadgeInput): string {
  const rawLabel = input.label ?? BRAND;
  const label = escapeXml(rawLabel);
  const score =
    input.score === null ? null : Math.max(0, Math.min(100, Math.round(input.score)));
  const note = input.note ? escapeXml(input.note) : null;
  const value = score === null ? (note ?? '—') : String(score);
  const aria = score === null ? value : `${value} из 100`;

  const labelX = PAD + LOGO_R * 2 + GAP;
  const plateW = labelX + textWidth(rawLabel, LABEL_FONT, true) + PAD;
  const x0 = plateW + PAD;

  // Правая часть растёт под длинное пояснение: обрезать слово хуже, чем
  // добавить ширины.
  const contentW =
    score === null
      ? textWidth(input.note ?? '—', NOTE_FONT)
      : textWidth(value, SCORE_FONT, true) + 2 + textWidth('/100', NOTE_FONT);
  const width = x0 + Math.max(RIGHT_MIN, contentW) + PAD;
  const trackW = width - x0 - PAD;
  const fillW = score === null ? 0 : Math.round((trackW * score) / 100);

  // Число сверху, полоса снизу; поля сверху и снизу равны.
  const scoreY = 15;
  const trackY = 19;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}" role="img" aria-label="${label}: ${aria}">`,
    `<title>${label}: ${aria}</title>`,
    `<clipPath id="r"><rect width="${width}" height="${HEIGHT}" rx="${RADIUS}"/></clipPath>`,
    `<g clip-path="url(#r)">`,
    `<rect width="${width}" height="${HEIGHT}" fill="${PANEL}"/>`,
    `<rect width="${plateW}" height="${HEIGHT}" fill="${INK}"/>`,
    planetSvg(PAD + LOGO_R, HEIGHT / 2, LOGO_R),
    `<g font-family="${FONT}">`,
    `<text x="${labelX}" y="18" fill="${PAPER}" font-size="${LABEL_FONT}" font-weight="600">${label}</text>`,
    score === null
      ? `<text x="${x0}" y="18" fill="${MUTED}" font-size="${NOTE_FONT}" font-weight="600">${value}</text>`
      : `<text x="${x0}" y="${scoreY}" fill="${INK}" font-size="${SCORE_FONT}" font-weight="700">${value}</text>` +
        `<text x="${x0 + textWidth(value, SCORE_FONT, true) + 2}" y="${scoreY}" fill="${MUTED}" font-size="${NOTE_FONT}" font-weight="600">/100</text>`,
    `</g>`,
    score === null
      ? ''
      : `<rect x="${x0}" y="${trackY}" width="${trackW}" height="${TRACK_H}" rx="${TRACK_H / 2}" fill="${TRACK}"/>` +
        (fillW > 0
          ? `<rect x="${x0}" y="${trackY}" width="${fillW}" height="${TRACK_H}" rx="${TRACK_H / 2}" fill="${INK}"/>`
          : ''),
    `</g>`,
    `</svg>`,
  ].join('');
}
