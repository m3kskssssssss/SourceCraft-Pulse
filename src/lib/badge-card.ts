// Бейдж-карточка Pulse: оценка плюс то, из чего она сложилась.
//
// Маленький бейдж (lib/badge.ts) отвечает на вопрос «сколько». Карточка — для
// своих репозиториев: общий балл, четыре категории полосами, язык и дата
// последнего пересчёта.
//
// Сетка: поля PAD со всех сторон, строки выровнены по общим базовым линиям —
// верхняя строка слева («Pulse») и справа (слаг) на одной высоте, нижняя
// подпись слева и подвал справа тоже. Обводки и общей обрезки нет: фон —
// две соседние фигуры (badgeBackground), без светлой каймы на тёмной теме.
//
// Палитра, логотип и экранирование — общие с маленьким бейджем
// (badge-shared.ts). Чистая функция без БД — ради Vitest-теста.

import { CATEGORY_ORDER, CATEGORY_TITLES, type CategoryValues } from './category-meta';
import {
  BRAND,
  FONT,
  INK,
  INK_2,
  MUTED,
  badgeBackground,
  PAPER,
  TRACK,
  escapeXml,
  planetSvg,
  textWidth,
} from './badge-shared';

export type BadgeCardInput = {
  org: string;
  repo: string;
  score: number | null;
  /** Что написать вместо балла, когда его нет: «нет оценки», «полезный материал». */
  note?: string;
  categories: CategoryValues;
  language: string | null;
  /** Уже отформатированная дата пересчёта, например «25.09.2026». */
  updated: string | null;
  /** Владелец подтвердил репозиторий — карточка обновляется каждый день. */
  verified: boolean;
};

const WIDTH = 440;
const HEIGHT = 132;
const RADIUS = 10;
const PAD = 16;
const PLATE = 128;

/** Базовые линии: верхняя строка, нижняя строка. */
const TOP_Y = PAD + 15;
const BOTTOM_Y = HEIGHT - PAD;

/** Логотип 22 px: читается как знак, а не как точка. */
const LOGO_R = 11;
const BAR_H = 4;

// Правая часть: подписи категорий, полоса, число справа.
const RIGHT_X = PLATE + PAD;
const RIGHT_END = WIDTH - PAD;
const LABEL_W = 92;
const VALUE_W = 28;
const BAR_X = RIGHT_X + LABEL_W;
const BAR_W = RIGHT_END - VALUE_W - BAR_X;
/** Четыре строки категорий между верхней строкой и подвалом, шаг ровный. */
const ROW_Y0 = TOP_Y + 22;
const ROW_STEP = 16;

/** На глаз: шрифта у нас нет, измерять нечем. */
const TITLE_MAX_CHARS = 36;

export function renderBadgeCardSvg(input: BadgeCardInput): string {
  const score =
    input.score === null ? null : Math.max(0, Math.min(100, Math.round(input.score)));
  const slug = `${input.org}/${input.repo}`;
  const title = escapeXml(truncate(slug, TITLE_MAX_CHARS));
  const note = escapeXml(input.note ?? 'нет оценки');
  const aria = escapeXml(
    score === null
      ? `${BRAND} ${slug}: ${input.note ?? 'нет оценки'}`
      : `${BRAND} ${slug}: ${score} из 100`,
  );

  const footer = [
    input.language,
    input.updated ? `обновлено ${input.updated}` : null,
    input.verified ? '✓ владелец' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const plateBarW = PLATE - PAD * 2;
  const plateFill = score === null ? 0 : Math.round((plateBarW * score) / 100);
  const scoreY = 84;
  const plateBarY = scoreY + 10;

  const rows = CATEGORY_ORDER.map((key, i) => {
    const value = input.categories[key];
    const y = ROW_Y0 + i * ROW_STEP;
    // Полоса по центру строчных букв подписи.
    const barY = y - 4 - BAR_H / 2;
    const fill =
      value === null ? 0 : Math.round((BAR_W * Math.max(0, Math.min(100, value))) / 100);
    return [
      `<text x="${RIGHT_X}" y="${y}" fill="${INK_2}" font-size="11">${escapeXml(CATEGORY_TITLES[key])}</text>`,
      `<rect x="${BAR_X}" y="${barY}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${TRACK}"/>`,
      fill > 0
        ? `<rect x="${BAR_X}" y="${barY}" width="${fill}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${INK}"/>`
        : '',
      `<text x="${RIGHT_END}" y="${y}" fill="${value === null ? MUTED : INK}" font-size="11" font-weight="600" text-anchor="end">${value === null ? '—' : value}</text>`,
    ].join('');
  }).join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${aria}">`,
    `<title>${aria}</title>`,
    badgeBackground(WIDTH, HEIGHT, PLATE, RADIUS),
    // Центр логотипа — на середине верхней строки: он, «Pulse» и слаг справа
    // стоят в один ряд.
    planetSvg(PAD + LOGO_R, PAD + LOGO_R, LOGO_R),
    `<g font-family="${FONT}">`,
    `<text x="${PAD + LOGO_R * 2 + 8}" y="${TOP_Y}" fill="${PAPER}" font-size="13" font-weight="700">${BRAND}</text>`,
    score === null
      ? `<text x="${PAD}" y="${scoreY - 4}" fill="${PAPER}" font-size="12" font-weight="600" opacity="0.7">${note}</text>`
      : `<text x="${PAD}" y="${scoreY}" fill="${PAPER}" font-size="38" font-weight="700" letter-spacing="-1">${score}</text>` +
        `<text x="${PAD + textWidth(String(score), 38, true) + 1}" y="${scoreY}" fill="${PAPER}" font-size="11" font-weight="600" opacity="0.6">/100</text>`,
    `<text x="${PAD}" y="${BOTTOM_Y}" fill="${PAPER}" font-size="10" opacity="0.6">здоровье репозитория</text>`,
    `<text x="${RIGHT_X}" y="${TOP_Y}" fill="${INK}" font-size="13" font-weight="700">${title}</text>`,
    rows,
    footer
      ? `<text x="${RIGHT_X}" y="${BOTTOM_Y}" fill="${MUTED}" font-size="10">${escapeXml(footer)}</text>`
      : '',
    `</g>`,
    `<rect x="${PAD}" y="${plateBarY}" width="${plateBarW}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${PAPER}" opacity="0.2"/>`,
    plateFill > 0
      ? `<rect x="${PAD}" y="${plateBarY}" width="${plateFill}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${PAPER}"/>`
      : '',
    `</svg>`,
  ].join('');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
