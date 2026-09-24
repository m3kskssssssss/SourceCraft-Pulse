// Иллюстрации статей: чёрно-белые схемы на SVG. Ширина области рисования —
// 400 единиц: на телефоне шириной 393 px текст схемы остаётся около 11 px,
// на экране ноутбука — около 20 px. Цвета — через переменные темы.

import type { ReactNode } from 'react';
import type { FigureId } from '@/lib/learn/types';

const INK = 'var(--ink)';
const MUTED = 'var(--muted)';
const PANEL = 'var(--panel)';
const PAPER = 'var(--paper)';
const LINE = 'var(--line-2)';
const MONO = 'var(--font-mono)';

function Svg({ h, label, children }: { h: number; label: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 400 ${h}`} role="img" aria-label={label} className="block h-auto w-full" style={{ fontFamily: 'var(--font-sans)' }}>
      {children}
    </svg>
  );
}

function T({ x, y, children, size = 12, weight = 400, fill = INK, anchor = 'start', mono = false }: {
  x: number; y: number; children: ReactNode; size?: number; weight?: number; fill?: string;
  anchor?: 'start' | 'middle' | 'end'; mono?: boolean;
}) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} fontFamily={mono ? MONO : undefined}>
      {children}
    </text>
  );
}

// Наконечник рисуем многоугольником, а не <marker>: у маркера нужен id, а на
// одной странице схем несколько — одинаковые id конфликтовали бы.
function Arrow({ x1, y1, x2, y2, dashed = false }: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 8, W = 4;
  const bx = x2 - Math.cos(a) * L, by = y2 - Math.sin(a) * L;
  const head = [
    [x2, y2],
    [bx + Math.sin(a) * W, by - Math.cos(a) * W],
    [bx - Math.sin(a) * W, by + Math.cos(a) * W],
  ].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  return (
    <g>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={INK} strokeWidth={1.5} strokeDasharray={dashed ? '4 3' : undefined} />
      <polygon points={head} fill={INK} />
    </g>
  );
}

// ---------- секреты ----------

function SecretHistory() {
  const xs = [50, 150, 250, 350];
  const labels = ['init', 'add config', 'remove key', 'fix typo'];
  const hashes = ['a1f', 'b27', 'c3e', 'd4a'];
  return (
    <Svg h={190} label="История из четырёх коммитов: ключ добавлен во втором и остаётся в нём после удаления в третьем">
      <line x1={50} y1={90} x2={350} y2={90} stroke={INK} strokeWidth={2} />
      {xs.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={90} r={9} fill={i === 1 ? INK : PAPER} stroke={INK} strokeWidth={2} />
          <T x={x} y={118} anchor="middle" mono size={11}>{hashes[i]}</T>
          <T x={x} y={134} anchor="middle" fill={MUTED} size={11}>{labels[i]}</T>
        </g>
      ))}
      <rect x={96} y={28} width={108} height={30} rx={6} fill={INK} />
      <T x={150} y={48} anchor="middle" mono size={11} fill={PAPER}>API_KEY=sk-…</T>
      <line x1={150} y1={58} x2={150} y2={80} stroke={INK} strokeWidth={1.5} />
      <T x={250} y={60} anchor="middle" mono size={11} fill={MUTED}>− API_KEY</T>
      <path d="M138 150 v8 h224 v-8" fill="none" stroke={INK} strokeWidth={1.5} />
      <T x={250} y={178} anchor="middle" mono size={11}>git show b27:config.ts</T>
    </Svg>
  );
}

function SecretFlow() {
  const box = (x: number, title: string, lines: string[], dark = false) => (
    <g>
      <rect x={x} y={40} width={112} height={110} rx={10} fill={dark ? INK : PANEL} stroke={INK} strokeWidth={1.5} />
      <T x={x + 56} y={30} anchor="middle" weight={600} size={12}>{title}</T>
      {lines.map((l, i) => (
        <T key={l} x={x + 12} y={68 + i * 22} mono size={11} fill={dark ? PAPER : INK}>{l}</T>
      ))}
    </g>
  );
  return (
    <Svg h={200} label="Секреты лежат в .env на машине и в хранилище CI, в репозитории только .env.example и код">
      {box(4, 'Ваша машина', ['.env', 'API_KEY=…'], true)}
      {box(144, 'Репозиторий', ['.env.example', 'API_KEY=', 'process.env'])}
      {box(284, 'CI / хостинг', ['секреты', 'API_KEY=…'], true)}
      <line x1={118} y1={95} x2={142} y2={95} stroke={INK} strokeWidth={1.5} strokeDasharray="4 3" />
      <path d="M124 87 l12 16 M136 87 l-12 16" stroke={INK} strokeWidth={2} />
      <Arrow x1={282} y1={120} x2={258} y2={120} />
      <T x={60} y={178} anchor="middle" fill={MUTED} size={11}>не коммитится</T>
      <T x={200} y={178} anchor="middle" fill={MUTED} size={11}>только имена</T>
      <T x={340} y={178} anchor="middle" fill={MUTED} size={11}>подставляется при запуске</T>
    </Svg>
  );
}

function SecretResponse() {
  const steps = ['Отозвать', 'Заменить', 'Журналы', 'История'];
  return (
    <Svg h={110} label="Четыре шага: отозвать, заменить, проверить журналы, почистить историю">
      {steps.map((s, i) => {
        const x = 4 + i * 100;
        return (
          <g key={s}>
            <rect x={x} y={30} width={84} height={50} rx={10} fill={i < 2 ? INK : PANEL} stroke={INK} strokeWidth={1.5} />
            <T x={x + 42} y={51} anchor="middle" size={11} fill={i < 2 ? PAPER : MUTED}>{`шаг ${i + 1}`}</T>
            <T x={x + 42} y={68} anchor="middle" size={13} weight={600} fill={i < 2 ? PAPER : INK}>{s}</T>
            {i < 3 && <Arrow x1={x + 86} y1={55} x2={x + 98} y2={55} />}
          </g>
        );
      })}
      <T x={102} y={100} anchor="middle" size={11} fill={MUTED}>сразу</T>
      <T x={302} y={100} anchor="middle" size={11} fill={MUTED}>потом</T>
    </Svg>
  );
}

// ---------- README ----------

function ReadmeFirstScreen() {
  const mark = (n: number, y: number) => (
    <g>
      <circle cx={372} cy={y} r={11} fill={INK} />
      <T x={372} y={y + 4} anchor="middle" size={12} weight={700} fill={PAPER}>{String(n)}</T>
      <line x1={338} y1={y} x2={360} y2={y} stroke={INK} strokeWidth={1} strokeDasharray="3 3" />
    </g>
  );
  return (
    <Svg h={270} label="Макет первого экрана README с тремя отмеченными частями">
      <rect x={4} y={4} width={330} height={216} rx={12} fill={PAPER} stroke={INK} strokeWidth={1.5} />
      <T x={22} y={36} size={18} weight={700}>acme/notify</T>
      <T x={22} y={56} size={12} fill={MUTED}>Уведомляет в браузере, когда падает сборка</T>
      {['build ✓', 'v1.4.0', 'MIT'].map((b, i) => (
        <g key={b}>
          <rect x={22 + i * 66} y={68} width={58} height={18} rx={9} fill={PANEL} stroke={LINE} />
          <T x={51 + i * 66} y={81} anchor="middle" size={10} mono>{b}</T>
        </g>
      ))}
      <T x={22} y={110} size={12} weight={600}>Быстрый старт</T>
      <rect x={22} y={118} width={294} height={52} rx={8} fill={INK} />
      <T x={34} y={139} mono size={11} fill={PAPER}>pnpm install</T>
      <T x={34} y={157} mono size={11} fill={PAPER}>pnpm dev</T>
      <T x={22} y={196} size={12} weight={600}>Документация · Примеры · Changelog</T>
      {mark(1, 46)}
      {mark(2, 144)}
      {mark(3, 192)}
      <line x1={4} y1={236} x2={334} y2={236} stroke={INK} strokeWidth={1} strokeDasharray="6 4" />
      <T x={4} y={256} size={11} fill={MUTED}>граница первого экрана — дальше детали</T>
    </Svg>
  );
}

function ReadmeDepth() {
  const rows = [
    { w: 392, t: '30 секунд · посетитель', d: 'Что это и зачем мне?' },
    { w: 300, t: '5 минут · пользователь', d: 'Как запустить и попробовать?' },
    { w: 208, t: '1 час · участник', d: 'Как устроено, как помочь?' },
  ];
  return (
    <Svg h={200} label="Три глубины чтения README: 30 секунд, 5 минут, 1 час">
      {rows.map((r, i) => {
        const x = (400 - r.w) / 2, y = 12 + i * 62;
        return (
          <g key={r.t}>
            <rect x={x} y={y} width={r.w} height={52} rx={10} fill={i === 0 ? INK : i === 1 ? PANEL : PAPER} stroke={INK} strokeWidth={1.5} />
            <T x={200} y={y + 22} anchor="middle" size={12} weight={600} fill={i === 0 ? PAPER : INK}>{r.t}</T>
            <T x={200} y={y + 40} anchor="middle" size={12} fill={i === 0 ? PAPER : MUTED}>{r.d}</T>
          </g>
        );
      })}
    </Svg>
  );
}

// ---------- зависимости ----------

function SemverRanges() {
  // ось версий: 1.4.2 … 2.0.0 (условная шкала)
  const ticks = [
    { x: 110, l: '1.4.2' }, { x: 170, l: '1.4.9' }, { x: 230, l: '1.5.0' }, { x: 300, l: '1.9.3' }, { x: 380, l: '2.0.0' },
  ];
  const rows = [
    { r: '^1.4.2', to: 372, d: 'до 2.0.0' },
    { r: '~1.4.2', to: 222, d: 'до 1.5.0' },
    { r: '1.4.2', to: 112, d: 'ровно' },
  ];
  return (
    <Svg h={230} label="Диапазоны версий: каретка, тильда и точная версия на оси">
      <T x={200} y={34} anchor="middle" size={26} weight={700} mono>1 . 4 . 2</T>
      <T x={152} y={54} anchor="middle" size={10} fill={MUTED}>MAJOR</T>
      <T x={200} y={54} anchor="middle" size={10} fill={MUTED}>MINOR</T>
      <T x={248} y={54} anchor="middle" size={10} fill={MUTED}>PATCH</T>
      <line x1={110} y1={86} x2={380} y2={86} stroke={INK} strokeWidth={1.5} />
      {ticks.map((t) => (
        <g key={t.l}>
          <line x1={t.x} y1={80} x2={t.x} y2={92} stroke={INK} strokeWidth={1.5} />
          <T x={t.x} y={76} anchor="middle" size={10} mono fill={MUTED}>{t.l}</T>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = 112 + i * 38;
        return (
          <g key={r.r}>
            <T x={4} y={y + 13} size={13} mono weight={600}>{r.r}</T>
            <rect x={110} y={y} width={Math.max(4, r.to - 110)} height={18} rx={9} fill={i === 0 ? INK : i === 1 ? MUTED : INK} />
            <T x={r.to + 8} y={y + 13} size={11} fill={MUTED}>{r.d}</T>
          </g>
        );
      })}
      <line x1={380} y1={100} x2={380} y2={210} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
      <T x={376} y={224} anchor="end" size={10} fill={MUTED}>мажорная — только вручную</T>
    </Svg>
  );
}

function LockfileTree() {
  return (
    <Svg h={220} label="package.json с диапазонами и lock-файл с точными версиями всего дерева">
      <rect x={4} y={30} width={150} height={120} rx={10} fill={PANEL} stroke={INK} strokeWidth={1.5} />
      <T x={79} y={20} anchor="middle" size={12} weight={600}>package.json</T>
      <T x={16} y={62} mono size={11}>http-client</T>
      <T x={16} y={78} mono size={11} fill={MUTED}>^2.1.0</T>
      <T x={16} y={108} mono size={11}>date-utils</T>
      <T x={16} y={124} mono size={11} fill={MUTED}>~1.4.2</T>
      <Arrow x1={158} y1={90} x2={186} y2={90} />
      <rect x={190} y={30} width={206} height={180} rx={10} fill={INK} />
      <T x={293} y={20} anchor="middle" size={12} weight={600}>lock-файл</T>
      {[
        { t: 'http-client 2.3.4', d: 0, y: 60 },
        { t: 'url-parser 1.5.3', d: 1, y: 84 },
        { t: 'retry 0.13.1', d: 1, y: 108 },
        { t: 'backoff 2.0.2', d: 2, y: 132 },
        { t: 'date-utils 1.4.7', d: 0, y: 164 },
        { t: 'tz-data 3.1.0', d: 1, y: 188 },
      ].map((n) => (
        <g key={n.t}>
          {n.d > 0 && <path d={`M${200 + (n.d - 1) * 18 + 4} ${n.y - 18} v14 h10`} fill="none" stroke={PAPER} strokeWidth={1} />}
          <T x={204 + n.d * 18} y={n.y} mono size={11} fill={PAPER}>{n.t}</T>
        </g>
      ))}
      <T x={4} y={176} size={11} fill={MUTED}>условные пакеты:</T>
      <T x={4} y={192} size={11} fill={MUTED}>диапазоны → точные</T>
      <T x={4} y={208} size={11} fill={MUTED}>версии всего дерева</T>
    </Svg>
  );
}

function UpdateCadence() {
  const weeks = Array.from({ length: 12 }, (_, i) => 30 + i * 30);
  return (
    <Svg h={170} label="Ритм обновлений за 12 недель: патчи еженедельно, минорные ежемесячно, мажорная по плану">
      <line x1={20} y1={90} x2={390} y2={90} stroke={INK} strokeWidth={1.5} />
      {weeks.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={90} r={4} fill={INK} />
          {(i + 1) % 4 === 0 && <rect x={x - 9} y={58} width={18} height={18} rx={4} fill={PANEL} stroke={INK} strokeWidth={1.5} />}
          <T x={x} y={112} anchor="middle" size={9} fill={MUTED}>{String(i + 1)}</T>
        </g>
      ))}
      <path d="M300 24 l6 12 l13 2 l-9 9 l2 13 l-12 -6 l-12 6 l2 -13 l-9 -9 l13 -2 z" fill={INK} />
      <line x1={300} y1={62} x2={300} y2={82} stroke={INK} strokeWidth={1} strokeDasharray="3 3" />
      <circle cx={30} cy={146} r={4} fill={INK} />
      <T x={40} y={150} size={11}>патч — каждую неделю, бот</T>
      <rect x={196} y={138} width={14} height={14} rx={3} fill={PANEL} stroke={INK} />
      <T x={216} y={150} size={11}>минорные — раз в месяц</T>
      <T x={326} y={40} size={11} weight={600}>мажорная</T>
      <T x={326} y={54} size={11} fill={MUTED}>по плану</T>
      <T x={20} y={128} size={9} fill={MUTED}>недели</T>
    </Svg>
  );
}

// ---------- метрики ----------

function BusFactorShare() {
  const rows = [
    { name: 'Проект A', parts: [40, 35, 25] },
    { name: 'Проект B', parts: [88, 8, 4] },
  ];
  const fills = [INK, MUTED, PANEL];
  const X0 = 90, W = 300;
  return (
    <Svg h={190} label="Доля изменений у трёх авторов в двух проектах и порог 30 процентов">
      {rows.map((r, i) => {
        const y = 40 + i * 64;
        let x = X0;
        return (
          <g key={r.name}>
            <T x={4} y={y + 22} size={13} weight={600}>{r.name}</T>
            {r.parts.map((p, j) => {
              const w = (p / 100) * W;
              const el = (
                <g key={j}>
                  <rect x={x} y={y} width={w} height={32} fill={fills[j]} stroke={INK} strokeWidth={1} />
                  {p >= 20 && <T x={x + w / 2} y={y + 21} anchor="middle" size={12} weight={600} fill={j === 0 ? PAPER : INK}>{`${p}%`}</T>}
                </g>
              );
              x += w;
              return el;
            })}
          </g>
        );
      })}
      <line x1={X0 + 0.3 * W} y1={26} x2={X0 + 0.3 * W} y2={150} stroke={INK} strokeWidth={1.5} strokeDasharray="5 4" />
      <T x={X0 + 0.3 * W} y={18} anchor="middle" size={11}>порог 30%</T>
      <T x={4} y={176} size={11} fill={MUTED}>чёрным — самый активный автор</T>
    </Svg>
  );
}

function ActivityShapes() {
  const steady = [2, 2, 3, 2, 2, 2, 1, 2, 3, 2, 2, 1, 2];
  const burst = [0, 0, 0, 0, 0, 0, 14, 10, 1, 1, 0, 0, 0];
  const chart = (data: number[], x0: number, title: string, sub: string) => (
    <g>
      <T x={x0} y={20} size={12} weight={600}>{title}</T>
      <T x={x0} y={36} size={11} fill={MUTED}>{sub}</T>
      <line x1={x0} y1={170} x2={x0 + 182} y2={170} stroke={INK} strokeWidth={1.5} />
      {data.map((v, i) => (
        v > 0
          ? <rect key={i} x={x0 + 2 + i * 14} y={170 - v * 8} width={10} height={v * 8} fill={INK} />
          : <rect key={i} x={x0 + 2 + i * 14} y={167} width={10} height={3} fill={LINE} />
      ))}
    </g>
  );
  return (
    <Svg h={200} label="Два графика по 26 коммитов за 13 недель: ровный ритм и всплеск">
      {chart(steady, 4, 'Ровный ритм', '26 коммитов · 13 из 13 недель')}
      {chart(burst, 212, 'Всплеск', '26 коммитов · 4 из 13 недель')}
      <T x={4} y={190} size={10} fill={MUTED}>недели →</T>
    </Svg>
  );
}

function MetricLoop() {
  const nodes = [
    { x: 200, y: 36, t: 'Метрика', d: 'наблюдаем' },
    { x: 330, y: 120, t: 'Цель', d: 'от неё зависит оценка' },
    { x: 200, y: 204, t: 'Поведение', d: 'подгоняют под число' },
    { x: 70, y: 120, t: 'Искажение', d: 'число растёт, суть нет' },
  ];
  return (
    <Svg h={240} label="Цикл Гудхарта: метрика становится целью, поведение подстраивается, метрика искажается">
      <circle cx={200} cy={120} r={84} fill="none" stroke={LINE} strokeWidth={1.5} strokeDasharray="4 4" />
      <Arrow x1={248} y1={48} x2={300} y2={88} />
      <Arrow x1={300} y1={152} x2={248} y2={192} />
      <Arrow x1={152} y1={192} x2={100} y2={152} />
      <Arrow x1={100} y1={88} x2={152} y2={48} dashed />
      {nodes.map((n, i) => (
        <g key={n.t}>
          <rect x={n.x - 62} y={n.y - 22} width={124} height={44} rx={10} fill={i === 0 ? INK : PAPER} stroke={INK} strokeWidth={1.5} />
          <T x={n.x} y={n.y - 3} anchor="middle" size={12} weight={600} fill={i === 0 ? PAPER : INK}>{n.t}</T>
          <T x={n.x} y={n.y + 13} anchor="middle" size={10} fill={i === 0 ? PAPER : MUTED}>{n.d}</T>
        </g>
      ))}
      <T x={200} y={124} anchor="middle" size={11} fill={MUTED}>закон Гудхарта</T>
    </Svg>
  );
}

const FIGURES: Record<FigureId, () => ReactNode> = {
  'secret-history': SecretHistory,
  'secret-flow': SecretFlow,
  'secret-response': SecretResponse,
  'readme-first-screen': ReadmeFirstScreen,
  'readme-depth': ReadmeDepth,
  'semver-ranges': SemverRanges,
  'lockfile-tree': LockfileTree,
  'update-cadence': UpdateCadence,
  'bus-factor-share': BusFactorShare,
  'activity-shapes': ActivityShapes,
  'metric-loop': MetricLoop,
};

export function Figure({ id }: { id: FigureId }) {
  const Render = FIGURES[id];
  return <Render />;
}
