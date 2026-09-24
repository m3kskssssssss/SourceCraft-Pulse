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
      <T x={60} y={172} anchor="middle" fill={MUTED} size={11}>не коммитится</T>
      <T x={200} y={172} anchor="middle" fill={MUTED} size={11}>только имена</T>
      <T x={340} y={172} anchor="middle" fill={MUTED} size={11}>подставляется</T>
      <T x={340} y={186} anchor="middle" fill={MUTED} size={11}>при запуске</T>
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
            {/* у каретки полоса доходит до края — подпись внутри неё */}
            {i === 0 ? (
              <T x={r.to - 10} y={y + 13} anchor="end" size={11} fill={PAPER}>{r.d}</T>
            ) : (
              <T x={r.to + 8} y={y + 13} size={11} fill={MUTED}>{r.d}</T>
            )}
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

// ---------- коммиты ----------

function CommitAnatomy() {
  const body = [
    'Токен обновлялся сразу в двух вкладках,',
    'и вторая затирала новую сессию старой.',
    'Теперь обновление идёт под блокировкой.',
  ];
  return (
    <Svg h={176} label="Сообщение коммита: заголовок, пустая строка и тело с объяснением">
      <rect x={4} y={6} width={392} height={164} rx={10} fill={PANEL} stroke={INK} strokeWidth={1.5} />
      <T x={20} y={30} size={10} fill={MUTED}>заголовок — что изменилось, до 72 символов</T>
      <T x={20} y={48} mono size={11} weight={600}>fix: не терять сессию при обновлении токена</T>
      <rect x={16} y={58} width={368} height={18} rx={4} fill="none" stroke={LINE} strokeDasharray="4 3" />
      <T x={24} y={71} size={10} fill={MUTED}>пустая строка</T>
      <T x={20} y={96} size={10} fill={MUTED}>тело — почему так и как проверить</T>
      {body.map((l, i) => (
        <T key={l} x={20} y={116 + i * 17} mono size={11}>{l}</T>
      ))}
    </Svg>
  );
}

function CommitLogCompare() {
  const bad = ['fix', 'wip', 'правки', 'fix again', 'final final'];
  const good = ['fix: пустой фильтр', 'feat: экспорт в CSV', 'refactor: парсер дат', 'docs: пример запуска', 'test: регрессия поиска'];
  const hashes = ['e41', 'b09', '7c2', 'a5d', '3f8'];
  const col = (x: number, title: string, rows: string[], dark: boolean) => (
    <g>
      <T x={x + 96} y={18} anchor="middle" size={12} weight={600}>{title}</T>
      <rect x={x} y={28} width={192} height={134} rx={10} fill={dark ? INK : PANEL} stroke={INK} strokeWidth={1.5} />
      {rows.map((r, i) => (
        <g key={r}>
          <T x={x + 12} y={54 + i * 24} mono size={10} fill={dark ? 'var(--line-2)' : MUTED}>{hashes[i]}</T>
          <T x={x + 40} y={54 + i * 24} mono size={10} fill={dark ? PAPER : INK}>{r}</T>
        </g>
      ))}
    </g>
  );
  return (
    <Svg h={168} label="Две истории из пяти коммитов: слева безликие сообщения, справа понятные">
      {col(4, 'Через год непонятно', bad, false)}
      {col(204, 'Через год понятно', good, true)}
    </Svg>
  );
}

function AtomicCommits() {
  const parts = ['исправление бага', 'переименование', 'новая функция'];
  return (
    <Svg h={196} label="Один коммит с тремя изменениями разделён на три коммита, каждый можно откатить отдельно">
      <T x={4} y={22} size={12} weight={600}>Было: один коммит</T>
      <rect x={4} y={34} width={150} height={110} rx={10} fill={INK} />
      {parts.map((p, i) => (
        <T key={p} x={18} y={66 + i * 28} size={12} fill={PAPER}>{p}</T>
      ))}
      <Arrow x1={160} y1={89} x2={190} y2={89} />
      <T x={200} y={22} size={12} weight={600}>Стало: три</T>
      <line x1={206} y1={52} x2={206} y2={128} stroke={INK} strokeWidth={2} />
      {parts.map((p, i) => (
        <g key={p}>
          <circle cx={206} cy={52 + i * 38} r={7} fill={i === 2 ? INK : PAPER} stroke={INK} strokeWidth={2} />
          <T x={222} y={56 + i * 38} size={12}>{p}</T>
        </g>
      ))}
      <T x={396} y={132} anchor="end" mono size={10} fill={MUTED}>revert</T>
      <T x={200} y={178} anchor="middle" size={11} fill={MUTED}>каждое изменение можно откатить или перенести отдельно</T>
    </Svg>
  );
}

// ---------- лицензия ----------

function Check({ x, y }: { x: number; y: number }) {
  return <path d={`M${x - 7} ${y} l5 5 l9 -11`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />;
}

function Cross({ x, y }: { x: number; y: number }) {
  return <path d={`M${x - 5} ${y - 6} l10 10 M${x + 5} ${y - 6} l-10 10`} fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" />;
}

function LicenseDefault() {
  const rows: Array<[string, boolean]> = [
    ['смотреть код на странице', true],
    ['скопировать к себе', false],
    ['изменить', false],
    ['раздавать дальше', false],
    ['использовать в продукте', false],
  ];
  return (
    <Svg h={206} label="Без файла лицензии код можно только смотреть; с MIT можно копировать, менять, раздавать и использовать">
      <rect x={300} y={6} width={96} height={166} rx={10} fill={PANEL} />
      <T x={240} y={26} anchor="middle" size={12} weight={600}>без LICENSE</T>
      <T x={348} y={26} anchor="middle" size={12} weight={600}>MIT</T>
      {rows.map(([label, withoutOk], i) => {
        const y = 58 + i * 26;
        return (
          <g key={label}>
            <line x1={4} y1={y - 16} x2={396} y2={y - 16} stroke={LINE} />
            <T x={8} y={y} size={12}>{label}</T>
            {withoutOk ? <Check x={240} y={y - 4} /> : <Cross x={240} y={y - 4} />}
            <Check x={348} y={y - 4} />
          </g>
        );
      })}
      <T x={8} y={196} size={11} fill={MUTED}>условие MIT: сохранить текст лицензии и копирайт</T>
    </Svg>
  );
}

function LicenseSpectrum() {
  const items = [
    { x: 44, name: 'MIT', a: 'сохранить', b: 'уведомление', fill: PAPER },
    { x: 122, name: 'Apache-2.0', a: '+ патенты', b: 'и NOTICE', fill: PAPER },
    { x: 200, name: 'MPL-2.0', a: 'открыть', b: 'свои файлы', fill: MUTED },
    { x: 278, name: 'GPL-3.0', a: 'открыть всё', b: 'при раздаче', fill: INK },
    { x: 356, name: 'AGPL-3.0', a: 'и при работе', b: 'по сети', fill: INK },
  ];
  return (
    <Svg h={150} label="Шкала лицензий от разрешительных MIT и Apache к копилефту GPL и AGPL">
      <T x={8} y={22} size={11} weight={600}>разрешительные</T>
      <T x={392} y={22} anchor="end" size={11} weight={600}>копилефт</T>
      <Arrow x1={8} y1={50} x2={394} y2={50} />
      {items.map((it) => (
        <g key={it.name}>
          <circle cx={it.x} cy={50} r={8} fill={it.fill} stroke={INK} strokeWidth={2} />
          <T x={it.x} y={80} anchor="middle" mono size={11} weight={600}>{it.name}</T>
          <T x={it.x} y={102} anchor="middle" size={10} fill={MUTED}>{it.a}</T>
          <T x={it.x} y={116} anchor="middle" size={10} fill={MUTED}>{it.b}</T>
        </g>
      ))}
      <T x={200} y={142} anchor="middle" size={11} fill={MUTED}>правее — больше обязательств у тех, кто берёт код</T>
    </Svg>
  );
}

// ---------- тесты ----------

function TestPyramid() {
  // вершина (110, 20), основание y = 190 от 10 до 210
  const hw = (y: number): number => (100 * (y - 20)) / 170;
  const band = (y0: number, y1: number): string =>
    [[110 - hw(y0), y0], [110 + hw(y0), y0], [110 + hw(y1), y1], [110 - hw(y1), y1]].map((p) => p.join(',')).join(' ');
  const notes = [
    { y: 50, a: 'мало, минуты', b: 'вся система целиком' },
    { y: 106, a: 'десятки, секунды', b: 'модули вместе' },
    { y: 162, a: 'сотни, миллисекунды', b: 'одна функция' },
  ];
  return (
    <Svg h={200} label="Пирамида тестов: много модульных внизу, меньше интеграционных, немного сквозных сверху">
      <polygon points={band(20, 77)} fill={PANEL} stroke={INK} strokeWidth={1.5} />
      <polygon points={band(77, 134)} fill={MUTED} stroke={INK} strokeWidth={1.5} />
      <polygon points={band(134, 190)} fill={INK} stroke={INK} strokeWidth={1.5} />
      <T x={110} y={66} anchor="middle" size={11} weight={600}>e2e</T>
      <T x={110} y={112} anchor="middle" size={11} weight={600} fill={PAPER}>интеграционные</T>
      <T x={110} y={168} anchor="middle" size={12} weight={600} fill={PAPER}>модульные</T>
      {notes.map((n) => (
        <g key={n.a}>
          <line x1={214} y1={n.y + 3} x2={222} y2={n.y + 3} stroke={LINE} />
          <T x={226} y={n.y} size={11}>{n.a}</T>
          <T x={226} y={n.y + 14} size={11} fill={MUTED}>{n.b}</T>
        </g>
      ))}
    </Svg>
  );
}

function TestRiskMap() {
  const X0 = 30, X1 = 394, Y0 = 26, Y1 = 206, MX = (X0 + X1) / 2, MY = (Y0 + Y1) / 2;
  const dots = [
    { x: 330, y: 50, t: 'оплата' },
    { x: 280, y: 84, t: 'права доступа' },
    { x: 90, y: 66, t: 'миграции БД' },
    { x: 260, y: 152, t: 'формат дат' },
    { x: 70, y: 160, t: 'страница «О нас»' },
  ];
  return (
    <Svg h={236} label="Карта рисков: чем чаще меняется код и дороже ошибка, тем раньше его стоит покрыть тестами">
      <T x={X0} y={16} size={11} fill={MUTED}>↑ цена ошибки</T>
      <rect x={MX} y={Y0} width={X1 - MX} height={MY - Y0} fill={INK} />
      <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke={INK} strokeWidth={1.5} />
      <line x1={MX} y1={Y0} x2={MX} y2={Y1} stroke={INK} strokeWidth={1} />
      <line x1={X0} y1={MY} x2={X1} y2={MY} stroke={INK} strokeWidth={1} />
      <T x={MX + 10} y={Y0 + 18} size={11} weight={600} fill={PAPER}>тестировать первым</T>
      <T x={X0 + 10} y={Y0 + 18} size={11} weight={600}>пара надёжных тестов</T>
      <T x={MX + 10} y={MY + 18} size={11} weight={600}>быстрые проверки</T>
      <T x={X0 + 10} y={MY + 18} size={11} weight={600}>можно подождать</T>
      {dots.map((d) => {
        const dark = d.x > MX && d.y < MY;
        return (
          <g key={d.t}>
            <circle cx={d.x} cy={d.y + 10} r={3.5} fill={dark ? PAPER : INK} />
            <T x={d.x + 8} y={d.y + 14} size={10} fill={dark ? 'var(--line-2)' : MUTED}>{d.t}</T>
          </g>
        );
      })}
      <T x={X1} y={226} anchor="end" size={11} fill={MUTED}>как часто меняется код →</T>
    </Svg>
  );
}

function FlakyTrust() {
  // p — прошёл, m — случайное падение, i — настоящая ошибка
  const before = 'ppmpmpimppmp';
  const after = 'pppppppipppp';
  const row = (y: number, pattern: string) =>
    pattern.split('').map((k, i) => (
      <rect
        key={i}
        x={16 + i * 31}
        y={y}
        width={24}
        height={22}
        rx={4}
        fill={k === 'p' ? PAPER : k === 'm' ? MUTED : INK}
        stroke={INK}
        strokeWidth={1.5}
      />
    ));
  return (
    <Svg h={206} label="Две ленты прогонов CI: с нестабильными тестами настоящая ошибка тонет среди случайных падений, после карантина она заметна сразу">
      <T x={16} y={18} size={12} weight={600}>С нестабильными тестами</T>
      {row(28, before)}
      <path d={`M${16 + 6 * 31 + 12} 54 v8`} stroke={INK} strokeWidth={1.5} />
      <T x={16} y={78} size={11} fill={MUTED}>настоящее падение теряется среди случайных</T>
      <T x={16} y={108} size={12} weight={600}>После карантина</T>
      {row(118, after)}
      <T x={16} y={162} size={11} fill={MUTED}>красное редко, и его разбирают сразу</T>
      <rect x={16} y={180} width={14} height={14} rx={3} fill={MUTED} stroke={INK} />
      <T x={36} y={192} size={11}>случайное падение</T>
      <rect x={180} y={180} width={14} height={14} rx={3} fill={INK} />
      <T x={200} y={192} size={11}>настоящая ошибка</T>
    </Svg>
  );
}

// ---------- pull request ----------

function PrSizeAttention() {
  const bars = [
    { l: '50', v: 1 },
    { l: '200', v: 0.72 },
    { l: '400', v: 0.46 },
    { l: '800', v: 0.26 },
    { l: '1500+', v: 0.12 },
  ];
  return (
    <Svg h={200} label="Условная схема: чем больше pull request, тем меньше внимания ревьюера достаётся каждой строке">
      <T x={4} y={16} size={11} fill={MUTED}>внимание ревьюера на строку, условно</T>
      <line x1={24} y1={160} x2={396} y2={160} stroke={INK} strokeWidth={1.5} />
      {bars.map((b, i) => {
        const x = 40 + i * 72;
        const h = 120 * b.v;
        return (
          <g key={b.l}>
            <rect x={x} y={160 - h} width={44} height={h} rx={4} fill={i === 0 ? INK : i < 3 ? MUTED : PANEL} stroke={INK} strokeWidth={1.2} />
            <T x={x + 22} y={178} anchor="middle" mono size={11}>{b.l}</T>
          </g>
        );
      })}
      <T x={200} y={196} anchor="middle" size={11} fill={MUTED}>размер pull request, строк</T>
    </Svg>
  );
}

function PrSplit() {
  const steps = [
    { n: '#1', a: 'чистка', b: 'без логики', s: '300 строк' },
    { n: '#2', a: 'модель', b: 'и миграция', s: '250 строк' },
    { n: '#3', a: 'API', b: 'и тесты', s: '400 строк' },
    { n: '#4', a: 'интерфейс', b: '', s: '450 строк' },
  ];
  return (
    <Svg h={200} label="Большой pull request на 1400 строк разбит на четыре последовательных поменьше">
      <rect x={4} y={6} width={392} height={34} rx={8} fill={INK} />
      <T x={200} y={28} anchor="middle" size={12} fill={PAPER}>один PR на 1400 строк: одобрят не глядя</T>
      <Arrow x1={200} y1={44} x2={200} y2={68} />
      {steps.map((st, i) => {
        const x = 4 + i * 102;
        return (
          <g key={st.n}>
            <rect x={x} y={74} width={84} height={82} rx={8} fill={PANEL} stroke={INK} strokeWidth={1.5} />
            <T x={x + 8} y={92} size={12} weight={600}>{st.n}</T>
            <T x={x + 8} y={110} size={10}>{st.a}</T>
            {st.b && <T x={x + 8} y={124} size={10}>{st.b}</T>}
            <T x={x + 8} y={146} mono size={10} fill={MUTED}>{st.s}</T>
            {i < 3 && <Arrow x1={x + 86} y1={115} x2={x + 100} y2={115} />}
          </g>
        );
      })}
      <T x={200} y={186} anchor="middle" size={11} fill={MUTED}>каждый проверяют за один подход и вливают по очереди</T>
    </Svg>
  );
}

// ---------- CI ----------

function CiTrustMap() {
  const inputs = [
    { t: 'ваш код', own: true },
    { t: 'сторонние шаги', own: false },
    { t: 'пакеты из реестра', own: false },
    { t: 'базовый образ', own: false },
  ];
  const outputs = ['прод', 'реестр пакетов'];
  return (
    <Svg h={250} label="CI-задача получает на вход ваш код, сторонние шаги, пакеты и образ, видит секреты и пишет в прод и реестр">
      {inputs.map((inp, i) => {
        const y = 12 + i * 52;
        return (
          <g key={inp.t}>
            <rect x={4} y={y} width={124} height={36} rx={8} fill={PAPER} stroke={INK} strokeWidth={1.5} strokeDasharray={inp.own ? undefined : '5 3'} />
            <T x={66} y={y + 22} anchor="middle" size={11}>{inp.t}</T>
            <Arrow x1={130} y1={y + 18} x2={158} y2={96 + i * 12} dashed={!inp.own} />
          </g>
        );
      })}
      <rect x={160} y={80} width={96} height={70} rx={10} fill={INK} />
      <T x={208} y={106} anchor="middle" size={12} weight={600} fill={PAPER}>CI-задача</T>
      <T x={208} y={124} anchor="middle" size={10} fill={PAPER}>видит секреты</T>
      <T x={208} y={138} anchor="middle" size={10} fill={PAPER}>и токен</T>
      {outputs.map((o, i) => {
        const y = 62 + i * 70;
        return (
          <g key={o}>
            <Arrow x1={258} y1={104 + i * 22} x2={284} y2={y + 18} />
            <rect x={286} y={y} width={110} height={36} rx={8} fill={PANEL} stroke={INK} strokeWidth={1.5} />
            <T x={341} y={y + 22} anchor="middle" size={11}>{o}</T>
          </g>
        );
      })}
      <rect x={4} y={226} width={26} height={14} rx={3} fill="none" stroke={INK} strokeDasharray="5 3" />
      <T x={38} y={237} size={11} fill={MUTED}>чужой код, который исполняется с вашими правами</T>
    </Svg>
  );
}

function PinTagVsSha() {
  return (
    <Svg h={190} label="Тег v4 после подмены указывает на вредный коммит, ссылка по хешу остаётся на проверенном">
      <rect x={4} y={24} width={170} height={36} rx={8} fill={PANEL} stroke={INK} strokeWidth={1.5} />
      <T x={16} y={46} mono size={11}>uses: tool@v4</T>
      <rect x={4} y={124} width={170} height={36} rx={8} fill={INK} />
      <T x={16} y={146} mono size={11} fill={PAPER}>uses: tool@a1b2c3d</T>
      <circle cx={290} cy={42} r={10} fill={INK} />
      <T x={290} y={47} anchor="middle" size={12} weight={700} fill={PAPER}>!</T>
      <T x={308} y={38} mono size={11}>e9f0a17</T>
      <T x={308} y={54} size={10} fill={MUTED}>с бэкдором</T>
      <circle cx={290} cy={142} r={10} fill={PAPER} stroke={INK} strokeWidth={2} />
      <T x={308} y={138} mono size={11}>a1b2c3d</T>
      <T x={308} y={154} size={10} fill={MUTED}>проверен</T>
      <Arrow x1={176} y1={42} x2={278} y2={42} />
      <T x={226} y={34} anchor="middle" size={10} fill={MUTED}>стало</T>
      <Arrow x1={176} y1={52} x2={280} y2={134} dashed />
      <T x={206} y={100} size={10} fill={MUTED}>было</T>
      <Arrow x1={176} y1={142} x2={278} y2={142} />
      <T x={226} y={134} anchor="middle" size={10} fill={MUTED}>всегда</T>
      <T x={4} y={184} size={11} fill={MUTED}>тег можно перевесить, хеш коммита — нельзя</T>
    </Svg>
  );
}

function TokenScope() {
  const jobs = ['тесты', 'линтер', 'деплой'];
  const cell = (x: number, y: number, a: string, b: string, dark: boolean) => (
    <g>
      <rect x={x} y={y} width={80} height={42} rx={8} fill={dark ? INK : PAPER} stroke={INK} strokeWidth={1.5} />
      <T x={x + 40} y={y + 18} anchor="middle" mono size={10} fill={dark ? PAPER : INK}>{a}</T>
      <T x={x + 40} y={y + 32} anchor="middle" mono size={10} fill={dark ? PAPER : MUTED}>{b}</T>
    </g>
  );
  return (
    <Svg h={196} label="По умолчанию у всех задач полный доступ и все секреты; по минимуму секреты видит только деплой">
      {jobs.map((j, i) => (
        <T key={j} x={170 + i * 90} y={20} anchor="middle" size={12} weight={600}>{j}</T>
      ))}
      <T x={4} y={60} size={11}>по умолчанию</T>
      <T x={4} y={128} size={11}>по минимуму</T>
      {jobs.map((j, i) => (
        <g key={j}>
          {cell(130 + i * 90, 34, 'write-all', 'все секреты', true)}
          {i < 2 ? cell(130 + i * 90, 102, 'read', 'без секретов', false) : cell(130 + i * 90, 102, 'deploy', '1 секрет', true)}
        </g>
      ))}
      <T x={200} y={176} anchor="middle" size={11} fill={MUTED}>утечка из тестов больше не даёт доступа к проду</T>
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
  'commit-anatomy': CommitAnatomy,
  'commit-log-compare': CommitLogCompare,
  'atomic-commits': AtomicCommits,
  'license-default': LicenseDefault,
  'license-spectrum': LicenseSpectrum,
  'test-pyramid': TestPyramid,
  'test-risk-map': TestRiskMap,
  'flaky-trust': FlakyTrust,
  'pr-size-attention': PrSizeAttention,
  'pr-split': PrSplit,
  'ci-trust-map': CiTrustMap,
  'pin-tag-vs-sha': PinTagVsSha,
  'token-scope': TokenScope,
};

export function Figure({ id }: { id: FigureId }) {
  const Render = FIGURES[id];
  return <Render />;
}
