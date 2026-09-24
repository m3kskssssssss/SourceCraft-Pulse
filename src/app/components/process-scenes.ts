// 8-битные сцены для рассказа о том, как проходит оценка: по одной на шаг.
// Те же холст 120×60, два цвета и примитивы, что у карточек статей. Каждая
// сцена — функция кадра внутри шага (0…STEP_FRAMES-1), поэтому любой шаг
// можно нарисовать сразу: при клике по списку и при «уменьшении движения».

import {
  SH,
  SW,
  bigText,
  clear,
  dither,
  easeOut,
  groundLine,
  ink,
  line,
  paper,
  prog,
  px,
  rand,
  sprite,
  text,
  type Ctx,
} from './learn/scenes';

export const STEP_FRAMES = 48;

// ---------- 1. API: антенна шлёт запросы, сервер отвечает данными ----------

function drawApi(c: Ctx, t: number): void {
  clear(c);
  groundLine(c, 50);
  paper(c);
  // тарелка слева
  line(c, 14, 49, 18, 38);
  line(c, 22, 49, 18, 38);
  sprite(c, ['#.....', '##....', '.##...', '..###.', '....##'], 12, 30);
  px(c, 19, 31, 2, 2);
  // сервер SourceCraft справа
  px(c, 88, 16, 22, 34);
  ink(c);
  for (let r = 0; r < 5; r++) {
    px(c, 90, 19 + r * 6, 18, 4);
    paper(c);
    if ((Math.floor(t / 3) + r) % 3 === 0) px(c, 104, 20 + r * 6, 2, 2);
    px(c, 92, 20 + r * 6, 6, 1);
    ink(c);
  }
  paper(c);
  line(c, 99, 16, 99, 9);
  px(c, 98, 8, 3, 1);
  // запросы туда (мелкие) и ответы обратно (крупные, разной формы)
  const arc = (k: number): [number, number] => [22 + (86 - 22) * k, 30 - 16 * Math.sin(Math.PI * k)];
  for (let i = 0; i < 3; i++) {
    const k = ((t / STEP_FRAMES) * 2 + i / 3) % 1;
    const [x, y] = arc(k);
    px(c, x, y, 2, 2);
  }
  const shapes = [['###', '#.#', '###'], ['.#.', '###', '.#.'], ['###', '###']];
  for (let i = 0; i < 3; i++) {
    const k = ((t / STEP_FRAMES) * 2 + i / 3 + 0.5) % 1;
    const [x, y] = arc(1 - k);
    sprite(c, shapes[i] ?? [], x, y + 6);
  }
}

// ---------- 2. Клон: растёт дерево каталогов ----------

const TREE: Array<{ depth: number; wide: number }> = [
  { depth: 0, wide: 10 }, { depth: 1, wide: 8 }, { depth: 2, wide: 12 }, { depth: 2, wide: 9 },
  { depth: 1, wide: 11 }, { depth: 2, wide: 7 }, { depth: 1, wide: 9 }, { depth: 2, wide: 13 },
];

function drawClone(c: Ctx, t: number): void {
  clear(c);
  paper(c);
  // стрелка «вниз по сети» — клон едет к нам
  const k = prog(t, 0, 10);
  if (k < 1) for (let i = 0; i < 4; i++) px(c, 8 + i * 3, 6 + Math.round(k * 20) + (i % 2), 2, 2);
  const shown = Math.floor(prog(t, 8, 40) * TREE.length);
  TREE.slice(0, shown + 1).forEach((node, i) => {
    const y = 8 + i * 6;
    const x = 30 + node.depth * 12;
    if (i > 0) {
      line(c, x - 8, y - 5, x - 8, y + 2);
      line(c, x - 8, y + 2, x - 2, y + 2);
    }
    px(c, x, y, 4, 4);
    ink(c);
    if (node.depth < 2) px(c, x + 1, y + 1, 2, 2);
    paper(c);
    dither(c, x + 7, y + 1, node.wide, 2, t % 2);
  });
  // счётчик файлов справа растёт вместе с деревом
  const files = String(Math.floor(prog(t, 8, 40) * 240));
  bigText(c, files, 88, 20);
  line(c, 86, 50, 116, 50);
}

// ---------- 3. Исходники: лупа идёт по строкам кода ----------

const CODE_LINES = [18, 26, 12, 30, 22, 8, 28, 16, 24];

function drawRead(c: Ctx, t: number): void {
  clear(c);
  paper(c);
  // лист с кодом
  px(c, 10, 4, 64, 52);
  ink(c);
  const lensRow = Math.min(CODE_LINES.length - 1, Math.floor(prog(t, 0, STEP_FRAMES - 8) * CODE_LINES.length));
  CODE_LINES.forEach((w, i) => {
    const y = 8 + i * 5;
    const indent = i % 3 === 0 ? 0 : 4;
    if (i === lensRow) { px(c, 12, y - 1, 60, 5); paper(c); px(c, 16 + indent, y + 1, w, 2); ink(c); }
    else px(c, 16 + indent, y + 1, w, 2);
    if (i === 5) { if (t % 6 < 3) px(c, 50, y + 1, 12, 2); } // TODO мигает
  });
  // лупа
  paper(c);
  const ly = 8 + lensRow * 5;
  const ring = ['..####..', '.#....#.', '#......#', '#......#', '#......#', '.#....#.', '..####..'];
  sprite(c, ring, 70, ly - 4);
  line(c, 77, ly + 3, 82, ly + 8);
  line(c, 78, ly + 3, 83, ly + 8);
  // справа растут измерения: тесты, длина файлов, комментарии, TODO
  for (let i = 0; i < 4; i++) {
    const h = Math.round(prog(t, 4 + i * 6, 30 + i * 4) * (10 + ((i * 7) % 12)));
    px(c, 92 + i * 6, 52 - h, 4, h);
  }
  px(c, 90, 53, 26, 1);
}

// ---------- 4. История: коммиты на ленте, авторы, доля самого активного ----------

function drawHistory(c: Ctx, t: number): void {
  clear(c);
  paper(c);
  line(c, 6, 30, 114, 30);
  const count = Math.floor(prog(t, 0, 32) * 14);
  const authors = [0, 0, 1, 0, 2, 0, 1, 0, 0, 2, 0, 1, 0, 0];
  for (let i = 0; i < count; i++) {
    const x = 10 + i * 7.5;
    const a = authors[i] ?? 0;
    px(c, x - 1, 29, 3, 3);
    // кто сделал коммит: три разных «головы» над лентой
    const heads = [['.#.', '###'], ['###', '#.#'], ['#.#', '###']];
    sprite(c, heads[a] ?? [], x - 1, 22 - (i % 2) * 3);
  }
  // в конце — полоса долей: у первого автора больше всего
  if (t >= 34) {
    const k = easeOut(prog(t, 34, 44));
    const w = Math.round(100 * k);
    px(c, 10, 42, Math.round(w * 0.64), 6);
    dither(c, 10 + Math.round(w * 0.64) + 1, 42, Math.round(w * 0.22), 6);
    px(c, 10 + Math.round(w * 0.86) + 2, 44, Math.round(w * 0.14), 2);
  }
}

// ---------- 5. Зависимости: сканер находит жука в lock-файле ----------

const PKGS = [22, 30, 18, 26, 34, 20, 28];

function drawSecurity(c: Ctx, t: number): void {
  clear(c);
  paper(c);
  PKGS.forEach((w, i) => {
    const y = 6 + i * 7;
    px(c, 8, y, 3, 3);
    px(c, 14, y + 1, w, 2);
  });
  // луч сканера сверху вниз
  const sy = 4 + Math.round(prog(t, 0, 30) * 48);
  if (t < 32) for (let x = 4; x < 60; x += 2) px(c, x, sy, 1, 1);
  // найденный пакет: инвертируем строку и выпускаем жука
  const bad = 3;
  const badY = 6 + bad * 7;
  if (sy > badY || t >= 32) {
    px(c, 6, badY - 2, 52, 7);
    ink(c);
    px(c, 14, badY + 1, PKGS[bad] ?? 0, 2);
    paper(c);
    const bx = 60 + Math.round(prog(t, 20, 34) * 26);
    sprite(c, ['#.#.#', '.###.', '#####', '.###.', '#.#.#'], bx, badY - 1);
    // щит встречает жука
    const shield = ['#######', '#.....#', '#.#.#.#', '#..#..#', '.#...#.', '..###..'];
    sprite(c, shield, 94, badY - 3);
    if (t >= 34 && t % 4 < 2) text(c, '!', 104, badY - 12);
  }
  // и ключ-секрет, которого в истории быть не должно, перечёркнут
  if (t >= 38) {
    sprite(c, ['.###.....', '#...#####', '#...#.#.#', '.###.....'], 90, 50);
    line(c, 88, 55, 101, 49);
  }
}

// ---------- 6. Модель читает: глаз, выбранные файлы, галочки ----------

function drawAi(c: Ctx, t: number): void {
  clear(c);
  paper(c);
  // большой глаз
  const blink = t % 24 >= 21;
  if (blink) px(c, 12, 22, 34, 2);
  else {
    const eye = [
      '......########......',
      '...###........###...',
      '.##..............##.',
      '#..................#',
      '.##..............##.',
      '...###........###...',
      '......########......',
    ];
    eye.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') px(c, 10 + i * 2, 16 + j * 2, 2, 2);
    });
    const look = Math.round(Math.sin(t / 5) * 5);
    px(c, 26 + look, 20, 8, 7);
    ink(c);
    px(c, 28 + look, 22, 3, 3);
    paper(c);
  }
  // файлы, которые модель выбрала читать, и галочки по ходу
  for (let i = 0; i < 5; i++) {
    const y = 6 + i * 10;
    const x = 64;
    px(c, x, y, 6, 8);
    ink(c);
    px(c, x + 4, y, 2, 2);
    paper(c);
    dither(c, x + 9, y + 3, 18 + ((i * 5) % 9), 2, t % 2);
    if (t > 8 + i * 7) sprite(c, ['....#', '...#.', '#.#..', '.#...'], x + 32, y + 2);
  }
}

// ---------- 7. Оценка: четыре категории растут, затем итоговый балл ----------

function drawScore(c: Ctx, t: number): void {
  clear(c);
  paper(c);
  const heights = [0.62, 0.74, 0.86, 0.5];
  heights.forEach((h, i) => {
    const k = easeOut(prog(t, i * 4, 20 + i * 4));
    const bh = Math.round(40 * h * k);
    const x = 10 + i * 13;
    px(c, x, 52 - bh, 9, bh);
    if (i % 2) { ink(c); dither(c, x + 1, 53 - bh, 7, Math.max(0, bh - 2)); paper(c); }
  });
  px(c, 6, 53, 52, 1);
  // сложение в балл
  if (t >= 20) {
    const k = prog(t, 20, 30);
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * 13 + (84 - 14 - i * 13) * k;
      const y = 20 + (30 - 20) * k - 10 * Math.sin(Math.PI * k);
      if (k < 1) px(c, x, y, 2, 2);
    }
  }
  if (t >= 30) {
    const value = Math.round(72 * easeOut(prog(t, 30, 40)));
    bigText(c, String(value), 74, 20);
    // кольцо вокруг балла
    const r = 20;
    const upto = Math.round(40 * (value / 100));
    for (let a = 0; a < upto; a++) {
      const ang = -Math.PI / 2 + (a / 40) * Math.PI * 2;
      px(c, 85 + Math.cos(ang) * r, 25 + Math.sin(ang) * r);
    }
  }
  if (t >= 42 && t % 4 < 2) for (let i = 0; i < 3; i++) px(c, 60 + rand(i + t) * 50, 5 + rand(i + 9) * 8);
}

export type ProcessStep = { key: string; title: string; text: string; draw: (c: Ctx, t: number) => void };

/**
 * Шаги в порядке настоящего прогона. Ключи совпадают с фазами из
 * lib/stages.ts, где шагов больше: клон и карту файлов здесь показываем
 * одной сценой.
 */
export const PROCESS_STEPS: ProcessStep[] = [
  {
    key: 'api',
    title: 'Спрашиваем SourceCraft',
    text: 'Через публичный API берём описание, язык, участников, ветки, теги и релизы, pull request и задачи. Чего в API нет, так и помечаем — «нет данных», а не угадываем.',
    draw: drawApi,
  },
  {
    key: 'clone',
    title: 'Клонируем и строим карту',
    text: 'Забираем одну ветку с историей за 90 дней — без рабочей копии, прямо в памяти. По дереву файлов строим карту каталогов, чтобы читать проект равномерно, а не только первую папку.',
    draw: drawClone,
  },
  {
    key: 'read',
    title: 'Читаем исходники',
    text: 'Проходим выборку файлов из всех каталогов и меряем: сколько тестов на сотню файлов, какой длины файлы, сколько пояснений и незакрытых TODO.',
    draw: drawRead,
  },
  {
    key: 'history',
    title: 'Разбираем историю',
    text: 'По коммитам за 90 дней смотрим ритм изменений, число активных авторов, свежесть последнего коммита и долю кода у самого активного — bus factor.',
    draw: drawHistory,
  },
  {
    key: 'security',
    title: 'Проверяем зависимости',
    text: 'Lock-файлы сверяем с базой уязвимостей OSV, смотрим, подключён ли бот обновлений, и ищем в истории строки, похожие на ключи и пароли.',
    draw: drawSecurity,
  },
  {
    key: 'ai',
    title: 'Модель читает код',
    text: 'Модель выбирает важные файлы, делает ревью кода, оценивает README по рубрике и понимает, проект это или подборка материалов. Если ревью прошло, его балл становится оценкой категорий «Код» и «Документация», а измеренные числа остаются рядом для сверки. Не прошло — считаем по измерениям.',
    draw: drawAi,
  },
  {
    key: 'score',
    title: 'Считаем оценку',
    text: 'Четыре категории — активность, код, безопасность, документация — дают итог 0–100 с равными весами. Затем подбираем рекомендации, которые дают больше всего баллов за единицу усилий.',
    draw: drawScore,
  },
];

export { SW as PROCESS_W, SH as PROCESS_H };
