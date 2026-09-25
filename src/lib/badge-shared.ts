// Общее для обоих бейджей Pulse: палитра, шрифт, логотип, экранирование.
//
// Бейджи живут в чужих README, поэтому только то, что работает в <img>:
// никаких внешних шрифтов и скриптов. Анимация логотипа — SMIL (<animate>
// внутри SVG): она играет и в картинке, в отличие от css-анимаций страницы.

/** Максимально чёрный: плашка и заливки. */
export const INK = '#000000';
export const PAPER = '#FFFFFF';
/** Фон правой части: без обводки бейдж держит форму и на белом, и на тёмном. */
export const PANEL = '#F5F5F5';
export const TRACK = '#E5E5E5';
export const INK_2 = '#404040';
export const MUTED = '#737373';

export const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Segoe UI, Arial, sans-serif";

export const BRAND = 'Pulse';

/** Ширина строки на глаз: шрифта у нас нет, измерять нечем. */
export function textWidth(text: string, fontSize: number, bold = false): number {
  return Math.ceil(text.length * fontSize * (bold ? 0.57 : 0.55));
}

const PERIOD_S = 12;
/** Три меридиана: при диаметре 18–22 px четыре сливались в сетку. */
const MERIDIANS = 3;
/** Ширина меридиана по фазе поворота — те же доли, что у логотипа на сайте. */
const TURN = [1, 0.924, 0.707, 0.383, 0.02, 0.383, 0.707, 0.924, 1];

/**
 * Проволочный глобус сайта: обод, три параллели и вращающиеся меридианы.
 * Меридиан «поворачивается», сжимаясь по косинусу; сдвиг фаз между ними
 * даёт вращение шара. Отрицательный begin стартует меридиан уже повёрнутым.
 */
export function planetSvg(cx: number, cy: number, r: number, color: string = PAPER): string {
  const tilt = 0.26;
  // Обод держит форму и толще; сетка внутри — тонкая и полупрозрачная,
  // иначе на маленьком знаке она забивает круг.
  const line = r >= 11 ? 1.4 : 1.2;
  const inner = round(line * 0.6);
  const parallels = [-0.62, 0, 0.62].map((k) => {
    const dy = k * r;
    const rx = Math.sqrt(r * r - dy * dy);
    return `<ellipse cx="${cx}" cy="${round(cy + dy)}" rx="${round(rx)}" ry="${round(Math.max(rx * tilt, 0.6))}"/>`;
  });
  const values = TURN.map((k) => round(k * r)).join(';');
  const meridians = Array.from({ length: MERIDIANS }, (_, i) => {
    const begin = -round((PERIOD_S / MERIDIANS) * i);
    return (
      `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r}">` +
      `<animate attributeName="rx" values="${values}" dur="${PERIOD_S}s" begin="${begin}s" repeatCount="indefinite"/>` +
      `</ellipse>`
    );
  });
  return [
    `<g fill="none" stroke="${color}" stroke-width="${line}">`,
    `<circle cx="${cx}" cy="${cy}" r="${r}"/>`,
    `<g stroke-width="${inner}" opacity="0.7">${parallels.join('')}${meridians.join('')}</g>`,
    `</g>`,
  ].join('');
}

/**
 * Фон бейджа — две соседние фигуры: чёрная плашка слева со скруглёнными
 * левыми углами и светлая часть справа со скруглёнными правыми.
 *
 * Раньше светлый прямоугольник лежал на всю ширину под плашкой, и оба
 * обрезались общим clipPath. На скруглении сглаживаются края обоих слоёв, и
 * светлый просвечивает каймой — на тёмной теме это белые уголки. Теперь слои
 * не перекрываются, а шов между ними — ровная вертикаль по целому пикселю.
 */
export function badgeBackground(width: number, height: number, plateW: number, radius: number): string {
  const r = radius;
  const plate = `M${r} 0H${plateW}V${height}H${r}A${r} ${r} 0 0 1 0 ${height - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
  const panel =
    `M${plateW} 0H${width - r}A${r} ${r} 0 0 1 ${width} ${r}V${height - r}` +
    `A${r} ${r} 0 0 1 ${width - r} ${height}H${plateW}Z`;
  return `<path d="${plate}" fill="${INK}"/><path d="${panel}" fill="${PANEL}"/>`;
}

/** Подпись и слаг приходят из URL и базы — в разметку только экранированными. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
