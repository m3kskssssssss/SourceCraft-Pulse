// Сцены «Как проходит оценка» в стиле логотипа: проволочные глобусы, тонкие
// линии в один пиксель, пунктирные орбиты и точки. Каждая сцена — функция
// времени внутри шага (0…STEP_SECONDS), поэтому любой шаг рисуется сразу:
// при клике по списку и при «уменьшении движения».
//
// Холст 240×120. Штрих не масштабируется вместе с картинкой — линии остаются
// тонкими и на телефоне, и на большом экране, как у планеты в шапке.

import type { ReactNode } from 'react';

export const STEP_SECONDS = 4.8;
export const VIEW_W = 240;
export const VIEW_H = 120;

const INK = 'var(--ink)';
const PAPER = 'var(--paper-2)';
const MUTED = 'var(--muted)';

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const prog = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
const easeOut = (x: number): number => 1 - (1 - x) * (1 - x);

/** Тонкая линия: штрих в один пиксель при любом масштабе. */
const thin = (opacity = 0.55, dash?: string) => ({
  fill: 'none',
  stroke: INK,
  strokeWidth: 1,
  strokeOpacity: opacity,
  strokeDasharray: dash,
  vectorEffect: 'non-scaling-stroke' as const,
});

function Label({ x, y, children, anchor = 'middle' }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={6.5} fill={MUTED} style={{ fontFamily: 'var(--font-sans)' }}>
      {children}
    </text>
  );
}

/**
 * Проволочный глобус, как логотип: параллели стоят, меридианы сжимаются по
 * косинусу со сдвигом фаз — шар вращается вокруг вертикальной оси.
 */
function Globe({
  cx,
  cy,
  r,
  t,
  period = 12,
  reveal = 1,
}: {
  cx: number;
  cy: number;
  r: number;
  t: number;
  period?: number;
  /** 0…1 — глобус проявляется: сначала обод, потом параллели, потом меридианы. */
  reveal?: number;
}) {
  const parallels = [-0.7, -0.37, 0, 0.37, 0.7];
  const meridians = 6;
  const rim = clamp01(reveal / 0.35);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...thin(0.8)} pathLength={1} strokeDasharray={`${rim} 1`} />
      {parallels.map((k, i) => {
        if (reveal < 0.35 + i * 0.07) return null;
        const dy = k * r;
        const rx = Math.sqrt(r * r - dy * dy);
        return <ellipse key={`p${i}`} cx={cx} cy={cy + dy} rx={rx} ry={Math.max(rx * 0.26, 0.4)} {...thin(0.45)} />;
      })}
      {reveal >= 0.75 &&
        Array.from({ length: meridians }, (_, i) => {
          const phase = (t / period) * Math.PI + (i * Math.PI) / meridians;
          return <ellipse key={`m${i}`} cx={cx} cy={cy} rx={Math.max(0.3, r * Math.abs(Math.cos(phase)))} ry={r} {...thin(0.45)} />;
        })}
    </g>
  );
}

/** Точка на квадратичной кривой Безье. */
function bezier(k: number, a: [number, number], c: [number, number], b: [number, number]): [number, number] {
  const u = 1 - k;
  return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1]];
}

/** Дуга окружности от угла a0 до a1 (радианы, 0 — вверх, по часовой). */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number): string => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)}`;
}

// ---------- 1. API: Pulse спрашивает, SourceCraft отвечает ----------

function ApiScene({ t }: { t: number }) {
  const from: [number, number] = [52, 58];
  const to: [number, number] = [140, 56];
  return (
    <g>
      {/* Pulse — маленький каркасный куб слева */}
      <g {...thin(0.8)}>
        <rect x={30} y={50} width={18} height={18} />
        <rect x={36} y={44} width={18} height={18} strokeOpacity={0.4} />
        <path d="M30 50 L36 44 M48 50 L54 44 M48 68 L54 62 M30 68 L36 62" strokeOpacity={0.4} />
      </g>
      <Label x={42} y={84}>Pulse</Label>

      <Globe cx={176} cy={58} r={34} t={t} />
      <ellipse cx={176} cy={58} rx={50} ry={13} {...thin(0.35, '2 3')} />
      <circle cx={176 + 50 * Math.cos(t * 1.4)} cy={58 + 13 * Math.sin(t * 1.4)} r={1.8} fill={INK} />
      <Label x={176} y={108}>SourceCraft</Label>

      {/* запросы туда по верхней дуге, ответы обратно по нижней */}
      <path d={`M${from[0]} ${from[1]} Q 96 18 ${to[0]} ${to[1]}`} {...thin(0.3, '2 3')} />
      <path d={`M${to[0]} ${to[1] + 6} Q 96 100 ${from[0]} ${from[1] + 6}`} {...thin(0.3, '2 3')} />
      {[0, 1, 2].map((i) => {
        const [x, y] = bezier(((t / 1.6) + i / 3) % 1, from, [96, 18], to);
        return <circle key={`q${i}`} cx={x} cy={y} r={1.6} fill={INK} />;
      })}
      {[0, 1, 2].map((i) => {
        const [x, y] = bezier(((t / 1.6) + i / 3 + 0.5) % 1, [to[0], to[1] + 6], [96, 100], [from[0], from[1] + 6]);
        return <circle key={`a${i}`} cx={x} cy={y} r={2.4} {...thin(0.9)} />;
      })}
    </g>
  );
}

// ---------- 2. Клон: рядом собирается копия ----------

function CloneScene({ t }: { t: number }) {
  const k = prog(t, 0.2, STEP_SECONDS - 0.4);
  return (
    <g>
      <Globe cx={56} cy={56} r={32} t={t} />
      <Label x={56} y={104}>SourceCraft</Label>
      <line x1={92} y1={56} x2={148} y2={56} {...thin(0.35, '2 3')} />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={92 + ((t * 30 + i * 14) % 56)} cy={56} r={1.4} fill={INK} />
      ))}
      <Globe cx={184} cy={56} r={32} t={t} reveal={k} />
      <Label x={184} y={104}>одна ветка · 90 дней</Label>
    </g>
  );
}

// ---------- 3. Исходники: полоса чтения по глобусу и строки кода ----------

const CODE = [70, 52, 84, 40, 76, 60, 30, 66];

function ReadScene({ t }: { t: number }) {
  const cx = 60;
  const cy = 58;
  const r = 38;
  const band = cy - r + ((t % 2.4) / 2.4) * r * 2;
  const row = Math.min(CODE.length - 1, Math.floor(prog(t, 0, STEP_SECONDS - 0.6) * CODE.length));
  return (
    <g>
      <clipPath id="read-clip">
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <Globe cx={cx} cy={cy} r={r} t={t} />
      <rect x={cx - r} y={band - 5} width={r * 2} height={10} fill={INK} fillOpacity={0.1} clipPath="url(#read-clip)" />
      <line x1={cx - r} y1={band} x2={cx + r} y2={band} {...thin(0.7)} clipPath="url(#read-clip)" />

      {CODE.map((w, i) => {
        const y = 22 + i * 10;
        const x = 124 + (i % 3 === 0 ? 0 : 8);
        const active = i === row;
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={x + w} y2={y} {...thin(active ? 0.95 : 0.3)} />
            {active && <circle cx={116} cy={y} r={1.8} fill={INK} />}
            {i === 5 && <Label x={x + w + 6} y={y + 2} anchor="start">TODO</Label>}
          </g>
        );
      })}
      <Label x={124} y={110} anchor="start">тесты · длина файлов · пояснения</Label>
    </g>
  );
}

// ---------- 4. История: коммиты ложатся на орбиту ----------

const AUTHORS = [0, 0, 1, 0, 2, 0, 1, 0, 0, 2, 0, 1];

function HistoryScene({ t }: { t: number }) {
  const cx = 120;
  const cy = 60;
  const rx = 100;
  const ry = 34;
  const shown = prog(t, 0, STEP_SECONDS - 0.8) * AUTHORS.length;
  const at = (i: number): [number, number] => {
    const a = Math.PI + (i / (AUTHORS.length - 1)) * Math.PI;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  };
  const head = at(Math.min(shown, AUTHORS.length - 1));
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...thin(0.3, '2 3')} />
      <Globe cx={cx} cy={cy + 6} r={24} t={t} />
      {AUTHORS.slice(0, Math.floor(shown) + 1).map((a, i) => {
        const [x, y] = at(i);
        if (a === 0) return <circle key={i} cx={x} cy={y} r={2.2} fill={INK} />;
        if (a === 1) return <circle key={i} cx={x} cy={y} r={2.4} {...thin(0.9)} />;
        return <rect key={i} x={x - 2} y={y - 2} width={4} height={4} {...thin(0.9)} />;
      })}
      {/* комета — «сейчас» на ленте истории */}
      <circle cx={head[0]} cy={head[1]} r={4} {...thin(0.5)} />
      <Label x={20} y={110} anchor="start">● самый активный автор</Label>
      <Label x={220} y={110} anchor="end">○ □ остальные</Label>
    </g>
  );
}

// ---------- 5. Зависимости: защитная сфера отбивает уязвимости ----------

const THREATS = [
  { angle: -0.9, at: 0.4 },
  { angle: 2.3, at: 1.6 },
  { angle: 0.8, at: 2.8 },
];

function SecurityScene({ t }: { t: number }) {
  const cx = 120;
  const cy = 58;
  const shield = 46;
  return (
    <g>
      <Globe cx={cx} cy={cy} r={30} t={t} />
      <circle cx={cx} cy={cy} r={shield} {...thin(0.45, '3 3')} strokeDashoffset={-t * 6} />
      {THREATS.map(({ angle, at }, i) => {
        const dt = t - at;
        if (dt < 0) return null;
        // летит к сфере, отскакивает, гаснет
        const d = dt < 0.6 ? 100 - (100 - shield - 4) * easeOut(dt / 0.6) : shield + 4 + (dt - 0.6) * 40;
        const x = cx + d * Math.sin(angle);
        const y = cy - d * Math.cos(angle);
        const fade = dt < 0.6 ? 1 : clamp01(1 - (dt - 0.6) / 0.9);
        return (
          <g key={i} opacity={fade}>
            <path d={`M${x - 2.5} ${y - 2.5} L${x + 2.5} ${y + 2.5} M${x + 2.5} ${y - 2.5} L${x - 2.5} ${y + 2.5}`} {...thin(0.95)} />
            {dt >= 0.6 && dt < 1.1 && <path d={arcPath(cx, cy, shield, angle - 0.35, angle + 0.35)} {...thin(1)} strokeWidth={2} />}
          </g>
        );
      })}
      <Label x={120} y={116}>lock-файлы против базы OSV · секреты в истории</Label>
    </g>
  );
}

// ---------- 6. Модель читает: глаз-глобус и выбранные файлы ----------

function AiScene({ t }: { t: number }) {
  const cx = 64;
  const cy = 58;
  const blink = t % 2.4 > 2.25;
  const files = [22, 46, 70, 94];
  return (
    <g>
      <path d={`M16 ${cy} Q ${cx} ${blink ? cy : cy - 50} 112 ${cy} Q ${cx} ${blink ? cy : cy + 50} 16 ${cy}`} {...thin(0.8)} />
      {!blink && (
        <>
          <Globe cx={cx} cy={cy} r={24} t={t} />
          <circle cx={cx + 12 * Math.sin(t * 1.3)} cy={cy} r={4} fill={INK} />
        </>
      )}
      {files.map((y, i) => {
        const start = 0.5 + i * 0.8;
        const k = prog(t, start, start + 0.5);
        const x = 176;
        return (
          <g key={y}>
            {k > 0 && <line x1={112} y1={cy} x2={112 + (x - 6 - 112) * k} y2={cy + (y - cy) * k} {...thin(0.35, '2 3')} />}
            <path d={`M${x} ${y - 7} h9 l4 4 v10 h-13 z M${x + 9} ${y - 7} v4 h4`} {...thin(0.8)} />
            {k >= 1 && <path d={`M${x + 20} ${y} l3 3 l6 -7`} {...thin(0.95)} strokeWidth={1.5} />}
          </g>
        );
      })}
    </g>
  );
}

// ---------- 7. Оценка: четыре кольца-категории и итог ----------

const CATEGORIES = [
  { label: 'активность', value: 0.62 },
  { label: 'код', value: 0.74 },
  { label: 'безопасность', value: 0.86 },
  { label: 'документация', value: 0.5 },
];

function ScoreScene({ t }: { t: number }) {
  const cx = 120;
  const cy = 54;
  const total = Math.round(72 * easeOut(prog(t, 2.4, 3.6)));
  return (
    <g>
      <Globe cx={cx} cy={cy} r={20} t={t} />
      {CATEGORIES.map((c, i) => {
        const r = 28 + i * 7;
        const k = easeOut(prog(t, i * 0.35, 1.6 + i * 0.35));
        const end = Math.max(0.001, Math.PI * 2 * c.value * k);
        return (
          <g key={c.label}>
            <circle cx={cx} cy={cy} r={r} {...thin(0.12)} />
            <path d={arcPath(cx, cy, r, 0, end)} {...thin(0.9)} strokeWidth={1.5} strokeLinecap="round" />
          </g>
        );
      })}
      {t >= 2.4 && (
        <>
          <circle cx={cx} cy={cy} r={14} fill={PAPER} />
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight={600} fill={INK} style={{ fontFamily: 'var(--font-sans)' }}>
            {total}
          </text>
        </>
      )}
      {/* Кольца изнутри наружу — в порядке подписи. */}
      <Label x={cx} y={116}>{CATEGORIES.map((c) => c.label).join(' · ')}</Label>
    </g>
  );
}

export type ProcessStep = { key: string; title: string; text: string; Scene: (props: { t: number }) => ReactNode };

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
    Scene: ApiScene,
  },
  {
    key: 'clone',
    title: 'Клонируем и строим карту',
    text: 'Забираем одну ветку с историей за 90 дней — без рабочей копии, прямо в памяти. По дереву файлов строим карту каталогов, чтобы читать проект равномерно, а не только первую папку.',
    Scene: CloneScene,
  },
  {
    key: 'read',
    title: 'Читаем исходники',
    text: 'Проходим выборку файлов из всех каталогов и меряем: сколько тестов на сотню файлов, какой длины файлы, сколько пояснений и незакрытых TODO.',
    Scene: ReadScene,
  },
  {
    key: 'history',
    title: 'Разбираем историю',
    text: 'По коммитам за 90 дней смотрим ритм изменений, число активных авторов, свежесть последнего коммита и долю кода у самого активного — bus factor.',
    Scene: HistoryScene,
  },
  {
    key: 'security',
    title: 'Проверяем зависимости',
    text: 'Lock-файлы сверяем с базой уязвимостей OSV, смотрим, подключён ли бот обновлений, и ищем в истории строки, похожие на ключи и пароли.',
    Scene: SecurityScene,
  },
  {
    key: 'ai',
    title: 'Модель читает код',
    text: 'Модель выбирает важные файлы, делает ревью кода, оценивает README по рубрике и понимает, проект это или подборка материалов. Если ревью прошло, его балл становится оценкой категорий «Код» и «Документация», а измеренные числа остаются рядом для сверки. Не прошло — считаем по измерениям.',
    Scene: AiScene,
  },
  {
    key: 'score',
    title: 'Считаем оценку',
    text: 'Четыре категории — активность, код, безопасность, документация — дают итог 0–100 с равными весами. Затем подбираем рекомендации, которые дают больше всего баллов за единицу усилий.',
    Scene: ScoreScene,
  },
];
