// 8-битные сцены для карточек статей. Холст 120×60, два цвета, 12 кадров в
// секунду. Каждый кадр — чистая функция номера кадра: физика обломков и
// шагов считается по формуле, а не накапливается, поэтому цикл замыкается
// без рывка и любой кадр можно нарисовать сразу (статичный кадр при
// «уменьшении движения»).

import type { SceneId } from '@/lib/learn/types';

export const SW = 120;
export const SH = 60;
export const FPS = 12;

const INK = '#0a0a0a';
const PAPER = '#f5f5f5';

type Ctx = CanvasRenderingContext2D;

export type Scene = { frames: number; still: number; draw: (c: Ctx, f: number) => void };

// ---------- примитивы ----------

function clear(c: Ctx): void {
  c.fillStyle = INK;
  c.fillRect(0, 0, SW, SH);
  c.fillStyle = PAPER;
}

function px(c: Ctx, x: number, y: number, w = 1, h = 1): void {
  c.fillRect(Math.round(x), Math.round(y), w, h);
}

function ink(c: Ctx): void {
  c.fillStyle = INK;
}

function paper(c: Ctx): void {
  c.fillStyle = PAPER;
}

/** Спрайт из строк: '#' — пиксель цвета бумаги, остальное прозрачно. */
function sprite(c: Ctx, rows: readonly string[], x: number, y: number): void {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') px(c, x + i, y + j);
  });
}

/** Шахматный полутон — единственный «серый», который есть у двух цветов. */
function dither(c: Ctx, x: number, y: number, w: number, h: number, phase = 0): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j + phase) % 2 === 0) px(c, x + i, y + j);
}

function line(c: Ctx, x0: number, y0: number, x1: number, y1: number, dash = 0): void {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, n = 0;
  for (;;) {
    if (!dash || Math.floor(n / dash) % 2 === 0) px(c, x0, y0);
    n++;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

const rand = (n: number): number => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const prog = (f: number, a: number, b: number): number => clamp01((f - a) / (b - a));
const easeOut = (x: number): number => 1 - (1 - x) * (1 - x);
const easeIn = (x: number): number => x * x;

// шрифт 3×5 — только нужные буквы
const GLYPHS: Record<string, readonly string[]> = {
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  E: ['###', '#..', '##.', '#..', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  '!': ['#', '#', '#', '.', '#'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
};

function text(c: Ctx, s: string, x: number, y: number): void {
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS[ch];
    if (!g) { cx += 4; continue; }
    sprite(c, g, cx, y);
    cx += (g[0]?.length ?? 0) + 1;
  }
}

function groundLine(c: Ctx, y: number): void {
  paper(c);
  px(c, 0, y, SW, 1);
  dither(c, 0, y + 2, SW, SH - y - 2);
}

/** Шторка: тёмная полоса с полутоновым краем закрывает кадр слева направо. */
function curtain(c: Ctx, k: number): void {
  if (k <= 0) return;
  const w = Math.round(k * (SW + 6));
  ink(c);
  px(c, 0, 0, Math.max(0, w - 6), SH);
  for (let i = 0; i < 6; i++) {
    const x = w - 6 + i;
    for (let y = 0; y < SH; y++) if ((y + i) % (i + 2) !== 0) px(c, x, y);
  }
}

// ---------- танк стреляет в стену, за кладкой — ключ ----------

const TANK = [
  '      #####         ',
  '     #######        ',
  '   ##############   ',
  '  ################  ',
  ' ################## ',
];
const TREADS = ['# ## ## ## ## ## ## ', ' ## ## ## ## ## ## #'];
const KEY = [' ###     ', '#   #####', '#   # # #', ' ###     '];

const WALL = { x: 86, y: 20, w: 12, h: 30 };
const HIT = { x: 89, y: 42, r: 7.5 };
type Brick = { x: number; y: number; w: number; hole: boolean; i: number };
const BRICKS: Brick[] = (() => {
  const out: Brick[] = [];
  let i = 0;
  for (let r = 0; r < WALL.h / 3; r++) {
    const y = WALL.y + r * 3;
    for (let x = WALL.x - (r % 2 ? 2 : 0); x < WALL.x + WALL.w; x += 4) {
      const x0 = Math.max(x, WALL.x);
      const w = Math.min(x + 3, WALL.x + WALL.w) - x0;
      if (w <= 0) continue;
      const hole = Math.hypot(x0 + w / 2 - HIT.x, y + 1 - HIT.y) < HIT.r;
      out.push({ x: x0, y, w, hole, i: i++ });
    }
  }
  return out;
})();

const tankWall: Scene = {
  frames: 150,
  still: 78,
  draw(c, f) {
    clear(c);
    groundLine(c, 50);
    const shot = 40, impact = 49;
    const tx = -20 + 42 * easeOut(prog(f, 0, 34));
    const recoil = f >= shot && f < shot + 3 ? 2 : 0;
    paper(c);
    sprite(c, TANK, tx - recoil, 43);
    px(c, tx + 12 - recoil, 44, 8, 1); // ствол
    sprite(c, [TREADS[f < 34 ? f % 2 : 0] ?? ''], tx - recoil, 48);
    sprite(c, [' ################## '], tx - recoil, 49);
    if (f >= shot && f < shot + 2) sprite(c, ['.#.', '###', '.#.'], tx + 20, 43); // вспышка у дула
    if (f >= shot && f < impact) {
      const bx = tx + 21 + (HIT.x - 3 - (tx + 21)) * prog(f, shot, impact);
      px(c, bx, 44, 3, 1);
    }
    // ключ внутри стены — виден, когда кладка выбита
    const bob = f > impact + 10 && Math.floor(f / 6) % 2 ? -1 : 0;
    paper(c);
    sprite(c, KEY, 87, 40 + bob);
    for (const b of BRICKS) {
      if (!b.hole || f < impact) { paper(c); px(c, b.x, b.y, b.w, 2); continue; }
      // обломок: баллистика от момента попадания
      const t = f - impact;
      const vx = (rand(b.i) - 0.35) * 2.4, vy = -1.2 - rand(b.i + 7) * 1.6;
      let x = b.x + vx * t, y = b.y + vy * t + 0.12 * t * t;
      if (y > 48) { y = 48 + (b.i % 2); x = b.x + vx * Math.min(t, 14); }
      paper(c);
      px(c, x, y, 2, 1);
    }
    if (f >= impact && f < impact + 4) {
      const r = 3 + (f - impact) * 3;
      paper(c);
      for (let a = 0; a < 12; a++) px(c, HIT.x - 3 + Math.cos(a / 2) * r, HIT.y + Math.sin(a / 2) * r);
    }
    // искры вокруг ключа
    if (f > impact + 8 && f < 132) {
      paper(c);
      const k = Math.floor(f / 3) % 4;
      const spots: Array<[number, number]> = [[82, 36], [98, 37], [96, 45], [81, 45]];
      const [sx, sy] = spots[k] ?? [0, 0];
      sprite(c, ['.#.', '###', '.#.'], sx, sy);
    }
    curtain(c, prog(f, 132, 146));
  },
};

// ---------- развилка: указатель README загорается ----------

const WALK = [
  [' ### ', ' ### ', '  #  ', ' ### ', '# # #', '  #  ', ' # # ', '#   #'],
  [' ### ', ' ### ', '  #  ', ' ### ', '# # #', '  #  ', ' # # ', ' # # '],
] as const;

function walker(c: Ctx, x: number, feetY: number, f: number, moving: boolean): void {
  paper(c);
  sprite(c, WALK[moving ? Math.floor(f / 2) % 2 : 1] ?? WALK[1], x, feetY - 7);
}

const signpost: Scene = {
  frames: 144,
  still: 76,
  draw(c, f) {
    clear(c);
    paper(c);
    line(c, 0, 49, 64, 49);
    line(c, 64, 49, 120, 33, 2);
    line(c, 64, 49, 120, 58, 2);
    dither(c, 0, 52, 60, 8);
    // столб и табличка
    px(c, 63, 27, 1, 22);
    const lit = f >= 60 && f < 118;
    const blink = lit && f < 64 ? f % 2 === 0 : lit;
    if (blink) {
      px(c, 49, 17, 29, 10);
      ink(c);
      text(c, 'README', 52, 19);
      paper(c);
      // стрелка на верхнюю дорогу
      sprite(c, ['..###', '...##', '..#.#', '.#...', '#....'], 81, 15);
      if (Math.floor(f / 4) % 2) {
        line(c, 46, 14, 44, 12);
        line(c, 80, 26, 83, 28);
        line(c, 63, 14, 63, 11);
      }
    } else {
      // выключенная табличка — только рамка
      px(c, 49, 17, 29, 1); px(c, 49, 26, 29, 1); px(c, 49, 17, 1, 10); px(c, 77, 17, 1, 10);
    }
    // путник
    if (f < 40) walker(c, -6 + 58 * (f / 40), 48, f, true);
    else if (f < 66) {
      walker(c, 52, 48, f, false);
      if (f < 60 && Math.floor(f / 3) % 2) { paper(c); text(c, '?', 53, 32); }
      if (f >= 60) { paper(c); text(c, '!', 54, 32); }
    } else if (f < 110) {
      const k = (f - 66) / 44;
      const x = 52 + 70 * k;
      const y = x < 64 ? 48 : 48 - (x - 64) * (16 / 56);
      walker(c, x, y, f, true);
    }
  },
};

// ---------- башня из блоков: старый блок вынули, кран ставит новый ----------

const TOWER_X = 40, LAYERS = 9, GAP_LAYER = 4;
const layerY = (i: number): number => 44 - i * 5;

const blockTower: Scene = {
  frames: 160,
  still: 112,
  draw(c, f) {
    clear(c);
    groundLine(c, 49);
    paper(c);
    // кран
    for (let y = 6; y < 49; y++) if (y % 2 === 0) { px(c, 100, y); px(c, 102, y); } else px(c, 101, y);
    px(c, 34, 6, 72, 1);
    px(c, 104, 7, 5, 3);
    // шатание верхних этажей после того, как выдернули блок
    const wob = f >= 40 && f < 80 ? Math.round(Math.sin((f - 40) * 0.9) * 1.6 * (1 - (f - 40) / 40)) : 0;
    for (let i = 0; i < LAYERS; i++) {
      const dx = i > GAP_LAYER ? wob : 0;
      const y = layerY(i);
      if (i % 2) { px(c, TOWER_X + dx, y, 23, 4); continue; }
      for (let b = 0; b < 3; b++) {
        if (i === GAP_LAYER && b === 0) continue; // вынутый блок рисуем отдельно
        px(c, TOWER_X + dx + b * 8, y, 7, 4);
      }
    }
    // старый блок: выезжает влево и падает, в конце тает полутоном
    if (f < 150) {
      let x = TOWER_X, y = layerY(GAP_LAYER);
      if (f >= 20) x = TOWER_X - 16 * easeIn(prog(f, 20, 38));
      if (f >= 38) y = Math.min(45, layerY(GAP_LAYER) + 0.18 * (f - 38) ** 2);
      if (f < 132 || f % 2) { paper(c); px(c, x, y, 7, 4); }
      if (f >= 20 && f < 38) { ink(c); px(c, x + 2, y + 1, 3, 2); } // трещина
    }
    if (f >= 42 && f < 72 && Math.floor(f / 3) % 2) { paper(c); text(c, '!', 51, 2); }
    // новый блок на кране
    const trolleyX = f < 50 ? 96 : 96 - 70 * easeOut(prog(f, 50, 70));
    const hookY = f < 70 ? 10 : f < 90 ? 10 + (layerY(GAP_LAYER) - 10) * easeOut(prog(f, 70, 90)) : 10 + (layerY(GAP_LAYER) - 10) * (1 - prog(f, 100, 116));
    paper(c);
    px(c, trolleyX, 7, 4, 2);
    line(c, trolleyX + 2, 9, trolleyX + 2, hookY - 1);
    if (f < 150) {
      let bx = trolleyX - 1, by = hookY;
      if (f >= 90) { bx = 25 + (TOWER_X - 25) * easeOut(prog(f, 90, 100)); by = layerY(GAP_LAYER); }
      if (f < 70) by = 10;
      paper(c);
      px(c, bx, by, 7, 4);
      // пока блок новый — у него шахматная метка
      const fresh = f < 120 || (f < 130 && f % 4 < 2);
      if (fresh) { ink(c); dither(c, bx + 1, by + 1, 5, 2); }
    } else {
      paper(c);
      px(c, TOWER_X, layerY(GAP_LAYER), 7, 4);
    }
  },
};

// ---------- автобус под кардиограммой: пассажиры выходят, пульс слабеет ----------

const PASSENGER_EVENTS: Array<[number, number]> = [[0, 3], [48, 2], [74, 1], [130, 3]];

function passengersAt(f: number): number {
  let p = 3;
  for (const [at, n] of PASSENGER_EVENTS) if (f >= at) p = n;
  return p;
}

function ampAt(f: number): number {
  const level = (n: number): number => [0.08, 0.3, 0.6, 1][n] ?? 1;
  let prev = level(3), cur = level(3), from = 0;
  for (const [at, n] of PASSENGER_EVENTS) if (f >= at) { prev = cur; cur = level(n); from = at; }
  return prev + (cur - prev) * prog(f, from, from + 8);
}

function ecgShape(u: number): number {
  if (u >= 7 && u <= 9) return u === 8 ? -2 : -1;
  if (u === 13) return 2;
  if (u === 14) return -9;
  if (u === 15) return 4;
  if (u >= 20 && u <= 23) return u === 21 || u === 22 ? -3 : -1;
  return 0;
}

function bus(c: Ctx, x: number, p: number, f: number, moving: boolean): void {
  paper(c);
  px(c, x, 37, 36, 12);
  px(c, x + 1, 36, 34, 1);
  ink(c);
  for (let w = 0; w < 4; w++) px(c, x + 3 + w * 7, 39, 5, 4);
  px(c, x + 31, 39, 3, 10); // дверь
  px(c, x, 45, 30, 1);
  paper(c);
  for (let w = 0; w < p; w++) { px(c, x + 4 + w * 7, 40, 3, 2); px(c, x + 5 + w * 7, 42, 1, 1); }
  // колёса
  for (const wx of [x + 5, x + 26]) {
    ink(c); px(c, wx - 1, 47, 6, 4);
    paper(c); px(c, wx, 48, 4, 3);
    ink(c); px(c, wx + 1 + (moving ? f % 2 : 0), 49, 1, 1);
  }
}

const busPulse: Scene = {
  frames: 180,
  still: 104,
  draw(c, f) {
    clear(c);
    // кардиограмма
    const amp = ampAt(f);
    paper(c);
    let prevY = 16;
    for (let x = 0; x < SW; x++) {
      const y = Math.round(16 + ecgShape((x + f * 2) % 30) * amp);
      line(c, x, prevY, x, y);
      prevY = y;
    }
    dither(c, 0, 26, SW, 1);
    groundLine(c, 52);
    // остановка
    paper(c);
    px(c, 96, 34, 1, 18);
    px(c, 93, 30, 7, 5);
    ink(c); px(c, 95, 32, 3, 1);
    // автобус
    const p = passengersAt(f);
    const bx = f < 36 ? -40 + 86 * easeOut(f / 36) : f < 140 ? 46 : 46 + 84 * easeIn(prog(f, 140, 176));
    bus(c, bx, p, f, f < 36 || f >= 140);
    // выходят двое
    if (f >= 48 && f < 74) walker(c, 80 + 44 * prog(f, 48, 74), 51, f, true);
    if (f >= 74 && f < 100) walker(c, 80 + 44 * prog(f, 74, 100), 51, f, true);
    // один в салоне — тревога
    if (f >= 100 && f < 112 && f % 4 < 2) { paper(c); text(c, '!', 50, 29); }
    // заходят двое новых
    if (f >= 112 && f < 130) {
      const k = prog(f, 112, 130);
      walker(c, 124 - 42 * k, 51, f, true);
      walker(c, 132 - 42 * k, 51, f + 1, true);
    }
  },
};

// ---------- следы: путник идёт, над ним растёт история коммитов ----------

const RING = ['.###.', '#...#', '#...#', '#...#', '.###.'];
const DOT = ['.###.', '#####', '#####', '#####', '.###.'];
const NODES = [14, 38, 62, 86, 110];
const TRACK_Y = 12;
const firstWalkX = (f: number): number => -6 + 132 * prog(f, 0, 70);
const secondWalkX = (f: number): number => -6 + 132 * prog(f, 80, 150);
/** Кадр, на котором первый путник дошёл до узла x (центр спрайта — x + 2). */
const reachFrame = (x: number): number => (70 * (x + 4)) / 132;

const footprints: Scene = {
  frames: 168,
  still: 118,
  draw(c, f) {
    clear(c);
    groundLine(c, 49);
    const w1 = firstWalkX(f);
    const w2 = secondWalkX(f);
    // следы на снегу остаются позади первого путника
    paper(c);
    for (let x = 1; x < Math.min(w1, SW); x += 5) px(c, x, x % 10 < 5 ? 47 : 48, 2, 1);
    // линия истории до последнего узла и пунктирная «голова» к путнику
    const reached = NODES.filter((x) => f >= reachFrame(x));
    const lastNode = reached[reached.length - 1];
    if (lastNode !== undefined) {
      line(c, NODES[0] ?? 0, TRACK_Y + 2, lastNode, TRACK_Y + 2);
      if (f < 72) line(c, lastNode, TRACK_Y + 2, Math.min(w1 + 2, SW - 1), TRACK_Y + 2, 2);
    }
    for (const x of reached) {
      const age = f - reachFrame(x);
      // колышек от узла к земле — где был сделан шаг
      paper(c);
      line(c, x, TRACK_Y + 6, x, 45, 2);
      ink(c);
      px(c, x - 2, TRACK_Y, 5, 5);
      paper(c);
      const read = f >= 80 && w2 + 2 >= x;
      sprite(c, read ? DOT : RING, x - 2, TRACK_Y);
      if (age < 3) {
        px(c, x, TRACK_Y - 3); px(c, x, TRACK_Y + 7); px(c, x - 4, TRACK_Y + 2); px(c, x + 4, TRACK_Y + 2);
      }
      if (read && w2 + 2 - x < 4) { px(c, x - 4, TRACK_Y - 2); px(c, x + 4, TRACK_Y - 2); }
    }
    if (f < 72) walker(c, w1, 48, f, true);
    if (f >= 80 && f < 152) walker(c, w2, 48, f, true);
    curtain(c, prog(f, 152, 166));
  },
};

// ---------- обрыв: сверху падает доска-лицензия, по ней проходят все ----------

const GAP = { x0: 50, x1: 74 };
const PLANK = { x: 48, w: 28, h: 7 };

const bridge: Scene = {
  frames: 180,
  still: 118,
  draw(c, f) {
    clear(c);
    paper(c);
    px(c, 0, 49, GAP.x0, 1);
    px(c, GAP.x1, 49, SW - GAP.x1, 1);
    dither(c, 0, 51, GAP.x0, 9);
    dither(c, GAP.x1 + 1, 51, SW - GAP.x1 - 1, 9);
    px(c, GAP.x0 - 1, 49, 1, 11);
    px(c, GAP.x1, 49, 1, 11);
    // доска с MIT падает в обрыв и встаёт мостом
    if (f >= 44) {
      let y = 49;
      if (f < 56) y = -8 + 57 * easeIn(prog(f, 44, 56));
      else if (f < 60) y = 49 - Math.round(2 * Math.sin(Math.PI * prog(f, 56, 60)));
      paper(c);
      px(c, PLANK.x, y, PLANK.w, PLANK.h);
      ink(c);
      text(c, 'MIT', PLANK.x + 9, y + 1);
      if (f >= 56 && f < 60) {
        paper(c);
        px(c, PLANK.x - 3, 47); px(c, PLANK.x - 5, 45); px(c, PLANK.x + PLANK.w + 2, 47); px(c, PLANK.x + PLANK.w + 4, 45);
      }
    }
    // первый путник доходит до края, ждёт и переходит
    if (f < 30) walker(c, -6 + 48 * (f / 30), 48, f, true);
    else if (f < 62) {
      walker(c, 42, 48, f, false);
      if (f < 44 && Math.floor(f / 3) % 2) { paper(c); text(c, '?', 43, 33); }
    } else if (f < 100) walker(c, 42 + 84 * prog(f, 62, 100), 48, f, true);
    // за ним — остальные, уже не останавливаясь
    if (f >= 92 && f < 146) walker(c, -6 + 132 * prog(f, 92, 146), 48, f, true);
    if (f >= 108 && f < 162) walker(c, -6 + 132 * prog(f, 108, 162), 48, f + 1, true);
    curtain(c, prog(f, 162, 176));
  },
};

// ---------- канатоходец: срывается, сетка ловит и возвращает на канат ----------

const ACRO = ['.#.', '###', '.#.', '.#.', '#.#'];
const ROPE_Y = 18;
const NET_Y = 46;
const FALL_X = 58;

function netSag(f: number): number {
  return f >= 62 && f < 76 ? 5 * Math.sin(Math.PI * prog(f, 62, 76)) : 0;
}

/** Где стоят ноги канатоходца и насколько наклонён шест. */
function acrobat(f: number): { x: number; feet: number; tilt: number; cheer: boolean } {
  const onRope = ROPE_Y - 1;
  if (f < 40) return { x: 14 + (FALL_X - 14) * prog(f, 0, 40), feet: onRope, tilt: 0, cheer: false };
  if (f < 50) return { x: FALL_X, feet: onRope, tilt: Math.round(Math.sin(f * 1.4) * 2 * (1 + prog(f, 40, 50))), cheer: false };
  if (f < 62) return { x: FALL_X, feet: onRope + (NET_Y - ROPE_Y) * easeIn(prog(f, 50, 62)), tilt: f % 2 ? 3 : -3, cheer: false };
  if (f < 74) return { x: FALL_X, feet: NET_Y - 1 + netSag(f), tilt: 0, cheer: false };
  if (f < 90) return { x: FALL_X, feet: NET_Y - 1 - (NET_Y - ROPE_Y) * easeOut(prog(f, 74, 90)), tilt: 0, cheer: false };
  if (f < 126) return { x: FALL_X + 46 * prog(f, 90, 126), feet: onRope, tilt: 0, cheer: false };
  return { x: 104, feet: onRope, tilt: 0, cheer: true };
}

const tightrope: Scene = {
  frames: 160,
  still: 70,
  draw(c, f) {
    clear(c);
    paper(c);
    // столбы
    px(c, 8, ROPE_Y, 3, SH - ROPE_Y); px(c, 6, ROPE_Y - 1, 7, 1);
    px(c, 109, ROPE_Y, 3, SH - ROPE_Y); px(c, 107, ROPE_Y - 1, 7, 1);
    const a = acrobat(f);
    const onRope = Math.round(a.feet) === ROPE_Y - 1;
    // канат прогибается под человеком и дрожит, когда тот сорвался
    const shake = f >= 50 && f < 74 ? Math.round(2 * Math.sin(f * 1.3) * (1 - prog(f, 50, 74))) : 0;
    const midX = onRope ? Math.round(a.x + 1) : FALL_X + 1;
    const midY = onRope ? ROPE_Y + 1 : ROPE_Y + shake;
    line(c, 11, ROPE_Y, midX, midY);
    line(c, midX, midY, 108, ROPE_Y);
    // сетка: ячейки крестом, провисает в месте падения
    const sag = netSag(f);
    line(c, 11, NET_Y - 6, 14, NET_Y);
    line(c, 108, NET_Y - 6, 105, NET_Y);
    for (let x = 14; x <= 105; x++) {
      const y = NET_Y + Math.round(sag * Math.max(0, 1 - Math.abs(x - FALL_X) / 34));
      px(c, x, y);
      for (let j = 1; j <= 3; j++) if ((x + j) % 4 === 0 || (x - j) % 4 === 0) px(c, x, y + j);
    }
    // человек и шест
    const top = Math.round(a.feet) - 4;
    const ax = Math.round(a.x);
    sprite(c, ACRO, ax, top);
    if (a.cheer && Math.floor(f / 6) % 2) line(c, ax - 5, top - 2, ax + 7, top - 2);
    else line(c, ax - 5, top + 1 + a.tilt, ax + 7, top + 1 - a.tilt);
    if (f >= 44 && f < 62 && Math.floor(f / 3) % 2) text(c, '!', ax + 1, top - 9);
    curtain(c, prog(f, 144, 158));
  },
};

// ---------- рамка ревью: мелкие посылки проходят, большой ящик застревает ----------

const BELT_Y = 44;
const BELT_END = 106;
const GATE = { l: 66, r: 77, beam: 22 };
const SPEED = 1.5;
const CHECK = ['....#', '...#.', '#.#..', '.#...'];

type Parcel = { x: number; y: number; w: number; h: number };

function drawParcel(c: Ctx, p: Parcel): void {
  paper(c);
  px(c, p.x, p.y, p.w, p.h);
  ink(c);
  px(c, p.x + 1, p.y + Math.floor(p.h / 2), p.w - 2, 1);
}

/** Посылка на ленте: едет вправо, за краем ленты падает в корзину. */
function beltParcel(x: number): Parcel | null {
  if (x > SW) return null;
  if (x <= BELT_END) return { x, y: BELT_Y - 5, w: 6, h: 5 };
  const t = (x - BELT_END) / SPEED;
  const y = BELT_Y - 5 + 0.3 * t * t;
  return y > SH ? null : { x, y, w: 6, h: 5 };
}

const CRATE_STOP = GATE.l - 2 - 24;
const CRATE_ARRIVE = 50 + (CRATE_STOP + 26) / SPEED;
const SPLIT_AT = 116;
const PIECES_X = [24, 34, 44, 54];

const parcelSlot: Scene = {
  frames: 192,
  still: 100,
  draw(c, f) {
    clear(c);
    paper(c);
    // лента и корзина
    px(c, 0, BELT_Y, BELT_END + 6, 1);
    px(c, 0, BELT_Y + 3, BELT_END + 6, 1);
    const shift = Math.floor(f * SPEED);
    for (let x = 0; x < BELT_END + 6; x++) if ((x - shift + 600) % 6 < 3) px(c, x, BELT_Y + 1, 1, 2);
    dither(c, 0, BELT_Y + 6, BELT_END + 6, SH - BELT_Y - 6);
    px(c, 110, 50, 1, 10); px(c, 119, 50, 1, 10);
    // рамка сканера
    px(c, GATE.l, GATE.beam, 1, BELT_Y - GATE.beam);
    px(c, GATE.r, GATE.beam, 1, BELT_Y - GATE.beam);
    px(c, GATE.l - 2, GATE.beam - 3, GATE.r - GATE.l + 5, 3);

    const parcels: Parcel[] = [];
    for (const t of [0, 14, 28]) {
      if (f < t) continue;
      const p = beltParcel(-8 + SPEED * (f - t));
      if (p) parcels.push(p);
    }
    let crate: Parcel | null = null;
    if (f >= 50 && f < SPLIT_AT) {
      let x = Math.min(CRATE_STOP, -26 + SPEED * (f - 50));
      if (f >= CRATE_ARRIVE && f < CRATE_ARRIVE + 10) x += f % 2 ? 1 : -1;
      crate = { x, y: BELT_Y - 20, w: 24, h: 20 };
    }
    // ящик разваливается на четыре посылки, и они едут дальше
    if (f >= SPLIT_AT) {
      PIECES_X.forEach((tx, i) => {
        const k = easeOut(prog(f, SPLIT_AT, SPLIT_AT + 8));
        const sx = CRATE_STOP + (i % 2) * 12, sy = BELT_Y - 20 + Math.floor(i / 2) * 10;
        if (f < SPLIT_AT + 8) {
          parcels.push({ x: sx + (tx - sx) * k, y: sy + (BELT_Y - 5 - sy) * k, w: Math.round(12 - 6 * k), h: Math.round(10 - 5 * k) });
        } else {
          const p = beltParcel(tx + SPEED * (f - SPLIT_AT - 8));
          if (p) parcels.push(p);
        }
      });
    }

    // луч горит, пока под рамкой посылка
    const scanned = parcels.find((p) => p.w === 6 && p.x + 3 >= GATE.l && p.x + 3 <= GATE.r);
    if (scanned) {
      paper(c);
      px(c, GATE.l + 3, GATE.beam - 5, 5, 2);
      for (let y = GATE.beam; y < scanned.y - 1; y += 2) px(c, GATE.l + 5, y + (f % 2));
    }
    // галочка над рамкой — посылка только что прошла
    if (parcels.some((p) => p.w === 6 && p.x > GATE.r && p.x < GATE.r + 12)) { paper(c); sprite(c, CHECK, GATE.l + 3, 8); }
    for (const p of parcels) drawParcel(c, p);
    if (crate) {
      paper(c);
      px(c, crate.x, crate.y, crate.w, crate.h);
      ink(c);
      px(c, crate.x + 2, crate.y + 2, crate.w - 4, 1);
      px(c, crate.x + 2, crate.y + crate.h - 3, crate.w - 4, 1);
      line(c, crate.x + 3, crate.y + 4, crate.x + crate.w - 4, crate.y + crate.h - 5);
      line(c, crate.x + crate.w - 4, crate.y + 4, crate.x + 3, crate.y + crate.h - 5);
      if (f >= CRATE_ARRIVE && Math.floor(f / 3) % 2) { paper(c); text(c, '!', GATE.l + 5, 8); }
    }
    curtain(c, prog(f, 178, 190));
  },
};

// ---------- цепь: груз поднимают, слабое звено запирают замком ----------

const LINK = ['.#.', '#.#', '#.#', '#.#', '.#.'];
const LOCK = ['.###.', '#...#', '#####', '##.##', '#####'];
const BOX_X = 52;
const WEAK = 2;

function boxTop(f: number): number {
  if (f < 20) return 38;
  if (f < 106) return 38 - 6 * prog(f, 20, 60);
  return 32 - 8 * prog(f, 106, 150);
}

const chainLift: Scene = {
  frames: 180,
  still: 112,
  draw(c, f) {
    clear(c);
    groundLine(c, 50);
    paper(c);
    // балка на двух фермах и блок
    px(c, 20, 3, 80, 2);
    for (let y = 5; y < 50; y += 3) { px(c, 21, y); px(c, 98, y); }
    for (let y = 6; y < 50; y += 3) { px(c, 23, y); px(c, 96, y); }
    sprite(c, RING, 58, 5);
    const top = Math.round(boxTop(f));
    const jitter = f >= 60 && f < 84 ? (f % 2 ? 1 : -1) : 0;
    const fixed = f >= 100;
    // звенья считаем от груза вверх — так они едут вместе с ним
    let weakY = -99;
    for (let k = 0; ; k++) {
      const y = top - 5 - 4 * k;
      if (y < 10) break;
      const x = 59 + jitter;
      paper(c);
      if (k === WEAK) weakY = y;
      if (k % 2 === 1 && k !== WEAK) { px(c, x + 1, y, 1, 5); continue; }
      if (k !== WEAK || fixed) { sprite(c, LINK, x, y); continue; }
      // слабое звено: полутон, а когда начинает рваться — ещё и разомкнуто
      const open = f >= 60 && Math.floor(f / 3) % 2 === 0;
      LINK.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          if (row[i] !== '#' || ((i + j) % 2 !== 0 && !open) || (open && i === 2)) continue;
          px(c, x + i, y + j);
        }
      });
      if (f >= 60 && f < 84 && Math.floor(f / 3) % 2) text(c, '!', x + 6, y - 1);
    }
    // груз
    paper(c);
    px(c, BOX_X + jitter, top, 16, 12);
    ink(c);
    px(c, BOX_X + jitter, top + 3, 16, 1);
    px(c, BOX_X + 6 + jitter, top + 6, 4, 3);
    // замок подлетает справа и защёлкивается на слабом звене
    if (f >= 84 && weakY > 0) {
      const lx = f < 100 ? 120 - (120 - 63) * easeOut(prog(f, 84, 100)) : 63;
      paper(c);
      sprite(c, LOCK, lx, weakY);
      if (f >= 100 && f < 105) {
        const r = 3 + (f - 100) * 2;
        for (let a = 0; a < 8; a++) px(c, 65 + Math.cos(a * 0.785) * r, weakY + 2 + Math.sin(a * 0.785) * r);
      }
    }
    if (f >= 150 && f < 164 && Math.floor(f / 2) % 2) {
      paper(c);
      sprite(c, ['.#.', '###', '.#.'], BOX_X - 6, top + 2);
      sprite(c, ['.#.', '###', '.#.'], BOX_X + 19, top + 6);
    }
    curtain(c, prog(f, 164, 178));
  },
};

export const SCENES: Record<SceneId, Scene> = {
  'tank-wall': tankWall,
  signpost,
  'block-tower': blockTower,
  'bus-pulse': busPulse,
  footprints,
  bridge,
  tightrope,
  'parcel-slot': parcelSlot,
  'chain-lift': chainLift,
};
