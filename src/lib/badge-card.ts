// Бейдж-карточка Pulse: оценка плюс то, из чего она сложилась.
//
// Маленький бейдж (lib/badge.ts) отвечает на вопрос «сколько». Карточка — для
// своих репозиториев: общий балл, четыре категории полосами, язык и дата
// последнего пересчёта. Правила те же: без внешних шрифтов и скриптов, одним
// файлом, в чёрно-белой палитре сайта.
//
// Чистая функция без БД — ради Vitest-теста.

import { CATEGORY_ORDER, CATEGORY_TITLES, type CategoryValues } from './category-meta';

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
  /** Владелец подтвердил репозиторий ключом — карточка обновляется каждый день. */
  verified: boolean;
};

const WIDTH = 440;
const HEIGHT = 132;
const RADIUS = 10;
const PLATE = 124;

const RIGHT_X = PLATE + 18;
const LABEL_W = 92;
const BAR_X = RIGHT_X + LABEL_W;
const BAR_W = WIDTH - BAR_X - 44;
const BAR_H = 4;
const ROW_Y0 = 50;
const ROW_STEP = 17;

const INK = '#1D1D1F';
const INK_2 = '#3A3A3C';
const PAPER = '#FFFFFF';
const LINE = '#E5E5E5';
const LINE_2 = '#D4D4D4';
const MUTED = '#8A8A8E';

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Segoe UI, Arial, sans-serif";

/** На глаз: шрифта у нас нет, измерять нечем. */
const TITLE_MAX_CHARS = 36;

export function renderBadgeCardSvg(input: BadgeCardInput): string {
  const score =
    input.score === null ? null : Math.max(0, Math.min(100, Math.round(input.score)));
  const slug = `${input.org}/${input.repo}`;
  const title = escapeXml(truncate(slug, TITLE_MAX_CHARS));
  const note = escapeXml(input.note ?? 'нет оценки');
  const aria = escapeXml(
    score === null ? `pulse ${slug}: ${input.note ?? 'нет оценки'}` : `pulse ${slug}: ${score} из 100`,
  );

  const footer = [
    input.language,
    input.updated ? `обновлено ${input.updated}` : null,
    input.verified ? '✓ владелец' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const plateBarW = PLATE - 32;
  const plateFill = score === null ? 0 : Math.round((plateBarW * score) / 100);

  const rows = CATEGORY_ORDER.map((key, i) => {
    const value = input.categories[key];
    const y = ROW_Y0 + i * ROW_STEP;
    const fill = value === null ? 0 : Math.round((BAR_W * Math.max(0, Math.min(100, value))) / 100);
    return [
      `<text x="${RIGHT_X}" y="${y}" fill="${INK_2}" font-size="11">${escapeXml(CATEGORY_TITLES[key])}</text>`,
      `<rect x="${BAR_X}" y="${y - 6}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${LINE}"/>`,
      fill > 0
        ? `<rect x="${BAR_X}" y="${y - 6}" width="${fill}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${INK}"/>`
        : '',
      `<text x="${WIDTH - 16}" y="${y}" fill="${value === null ? MUTED : INK}" font-size="11" font-weight="600" text-anchor="end">${value === null ? '—' : value}</text>`,
    ].join('');
  }).join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${aria}">`,
    `<title>${aria}</title>`,
    `<clipPath id="r"><rect width="${WIDTH}" height="${HEIGHT}" rx="${RADIUS}"/></clipPath>`,
    `<g clip-path="url(#r)">`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}"/>`,
    `<rect width="${PLATE}" height="${HEIGHT}" fill="${INK}"/>`,
    // Планета — тот же знак, что в маленьком бейдже и логотипе.
    `<g transform="translate(26 24)">`,
    `<ellipse rx="10" ry="3.6" fill="none" stroke="${PAPER}" stroke-width="1" opacity="0.4" transform="rotate(-18)"/>`,
    `<circle r="6.4" fill="none" stroke="${PAPER}" stroke-width="1.3"/>`,
    `<path d="M-6 -2 Q0 -3.6 6 -2 M-6 2.4 Q0 4 6 2.4" fill="none" stroke="${PAPER}" stroke-width="0.9" opacity="0.55"/>`,
    `<circle cx="-2.2" cy="-0.4" r="1.9" fill="${PAPER}" opacity="0.8"/>`,
    `</g>`,
    `<g font-family="${FONT}">`,
    `<text x="42" y="28" fill="${PAPER}" font-size="12" font-weight="600">pulse</text>`,
    score === null
      ? `<text x="16" y="78" fill="${PAPER}" font-size="12" font-weight="600" opacity="0.7">${note}</text>`
      : `<text x="16" y="84" fill="${PAPER}" font-size="38" font-weight="700">${score}</text>` +
        `<text x="${16 + String(score).length * 22 + 4}" y="84" fill="${PAPER}" font-size="11" font-weight="600" opacity="0.6">/100</text>`,
    `<text x="16" y="116" fill="${PAPER}" font-size="10" opacity="0.6">здоровье репозитория</text>`,
    `<text x="${RIGHT_X}" y="26" fill="${INK}" font-size="13" font-weight="700">${title}</text>`,
    rows,
    footer
      ? `<text x="${RIGHT_X}" y="${HEIGHT - 14}" fill="${MUTED}" font-size="10">${escapeXml(footer)}</text>`
      : '',
    `</g>`,
    `<rect x="16" y="94" width="${plateBarW}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${PAPER}" opacity="0.2"/>`,
    plateFill > 0
      ? `<rect x="16" y="94" width="${plateFill}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${PAPER}"/>`
      : '',
    `</g>`,
    `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="${RADIUS}" fill="none" stroke="${LINE_2}"/>`,
    `</svg>`,
  ].join('');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Слаг и язык приходят из базы и URL — в разметку только экранированными. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
