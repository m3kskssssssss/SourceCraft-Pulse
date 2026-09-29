// Блок на главной: порядок обновления оценок. Слева — правила, справа — сцена
// в стиле планеты: по расписанию последний коммит ветки сверяется с коммитом
// оценки. Первая половина цикла — коммит тот же, оценка остаётся; вторая —
// появляется новый коммит, и оценка пересчитывается.
//
// Анимация — SMIL внутри SVG (как у ReposPromo и бейджей): без клиентского JS,
// компонент серверный. Всё зациклено на CYCLE секунд.

import type { CommitCheckBrief } from '@/lib/commit-check';
import { APP_TIME_ZONE } from '@/lib/time';

const CYCLE = 10;
const INK = 'var(--ink)';
const MONO = 'ui-monospace, monospace';

const thin = (opacity = 0.6) => ({
  fill: 'none',
  stroke: INK,
  strokeWidth: 1,
  strokeOpacity: opacity,
  vectorEffect: 'non-scaling-stroke' as const,
});

/** Видно только в окне [from, to] доли цикла. */
function shown(from: number, to: number) {
  return {
    attributeName: 'opacity',
    values: '0;0;1;1;0;0',
    keyTimes: `0;${from};${from + 0.02};${to - 0.02};${to};1`,
    dur: `${CYCLE}s`,
    repeatCount: 'indefinite',
  };
}

const RULES = [
  {
    title: 'Проверка по расписанию',
    text: 'ежедневно в 00:00 и 12:00 по московскому времени последний коммит основной ветки сравнивается с коммитом, по которому выполнена оценка.',
  },
  {
    title: 'Изменений нет',
    text: 'оценка сохраняется; в истории оценок фиксируется проверка без изменений.',
  },
  {
    title: 'Есть новые коммиты',
    text: 'выполняется повторная оценка; результат заменяет предыдущий в рейтинге, на карточке репозитория и в бейдже.',
  },
];

export function ScoreRefreshInfo({ brief }: { brief: CommitCheckBrief }) {
  const next = new Date(brief.nextSlot).toLocaleString('ru-RU', {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  const touched = brief.unchanged + brief.changed;

  return (
    <div className="grid items-center gap-8 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-10 md:p-10">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">Актуальность оценок</div>
        <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight [text-wrap:balance] sm:text-3xl">
          Обновление оценок
        </h2>
        <ul className="mt-6 grid gap-4">
          {RULES.map((rule, i) => (
            <li key={rule.title} className="rise flex gap-3" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--ink)] text-xs font-semibold text-[color:var(--paper)]">
                {i + 1}
              </span>
              <span className="text-[15px] leading-relaxed text-[color:var(--ink-2)]">
                <span className="font-medium text-[color:var(--ink)]">{rule.title}</span> — {rule.text}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-7 grid gap-1 text-sm text-[color:var(--muted)]">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${brief.enabled ? 'stage-pulse bg-[color:var(--ink)]' : 'bg-[color:var(--muted-2)]'}`}
              aria-hidden
            />
            <dt className="sr-only">Следующая проверка</dt>
            <dd>{brief.enabled ? `Следующая проверка: ${next} МСК.` : 'Плановая проверка приостановлена.'}</dd>
          </div>
          {touched > 0 && (
            <div className="pl-4">
              <dt className="sr-only">Текущий цикл</dt>
              <dd>
                Текущий цикл: без изменений — {brief.unchanged.toLocaleString('ru-RU')}, направлено на
                повторную оценку — {brief.changed.toLocaleString('ru-RU')}.
              </dd>
            </div>
          )}
        </dl>
      </div>

      <CheckScene />
    </div>
  );
}

/**
 * Ветка коммитов, отметка «оценено здесь» и счётчик балла. Сканер проходит
 * до верхушки ветки: в первой половине цикла верхушка совпадает с отметкой —
 * «=», балл прежний; во второй на ветке появляется новый коммит, сканер
 * доходит до него, отметка переезжает, балл сменяется.
 */
function CheckScene() {
  const y = 70;
  const commits = [24, 52, 80] as const;
  return (
    <svg viewBox="0 0 240 132" className="block h-auto w-full" role="img" aria-label="Сверка последнего коммита с коммитом оценки">
      {/* часы: стрелка делает оборот за полцикла — две проверки за цикл */}
      <g>
        <circle cx={24} cy={24} r={11} {...thin(0.8)} />
        <path d="M24 16 V24" {...thin(0.9)} strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" values="0 24 24;360 24 24" dur={`${CYCLE / 2}s`} repeatCount="indefinite" />
        </path>
        <text x={42} y={27} fontSize={7} fill={INK} fillOpacity={0.6} fontFamily={MONO}>
          00:00 · 12:00
        </text>
      </g>

      {/* ветка: старая часть и продолжение до нового коммита */}
      <path d={`M12 ${y} H${commits[2]}`} {...thin(0.8)} />
      <path d={`M${commits[2]} ${y} H110`} {...thin(0.8)} opacity={0}>
        <animate {...shown(0.52, 0.98)} />
      </path>
      {commits.map((x) => (
        <circle key={x} cx={x} cy={y} r={3.2} fill={INK} />
      ))}
      {/* новый коммит */}
      <circle cx={110} cy={y} r={3.2} fill={INK} opacity={0}>
        <animate {...shown(0.56, 0.98)} />
      </circle>

      {/* отметка «оценено»: под третьим коммитом, во второй половине переезжает к новому */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0;0 0;30 0;30 0;0 0"
          keyTimes="0;0.8;0.84;0.98;1"
          dur={`${CYCLE}s`}
          repeatCount="indefinite"
        />
        <path d={`M${commits[2]} ${y + 7} V${y + 16}`} {...thin(0.5)} strokeDasharray="2 2" />
        <text x={commits[2]} y={y + 25} textAnchor="middle" fontSize={6} fill={INK} fillOpacity={0.55} fontFamily={MONO}>
          оценено
        </text>
      </g>

      {/* сканер: идёт вдоль ветки до верхушки — в первый раз до третьего коммита, во второй до нового */}
      <ScannerSweep from={12} to={commits[2]} start={0.08} end={0.3} y={y} />
      <ScannerSweep from={12} to={110} start={0.6} end={0.8} y={y} />

      {/* итог сверки */}
      <text x={170} y={40} textAnchor="middle" fontSize={7} fill={INK} fillOpacity={0.6} fontFamily={MONO} opacity={0}>
        <animate {...shown(0.3, 0.5)} />
        коммит тот же
      </text>
      <text x={170} y={40} textAnchor="middle" fontSize={7} fill={INK} fillOpacity={0.6} fontFamily={MONO} opacity={0}>
        <animate {...shown(0.8, 0.98)} />
        новый коммит
      </text>

      {/* балл */}
      <ScoreBox />

      <text x={60} y={124} textAnchor="middle" fontSize={6} fill={INK} fillOpacity={0.55} fontFamily={MONO}>
        основная ветка
      </text>
      <text x={196} y={124} textAnchor="middle" fontSize={6} fill={INK} fillOpacity={0.55} fontFamily={MONO}>
        оценка
      </text>
    </svg>
  );
}

/** Линия сканера, проходящая по ветке от `from` до `to` в окне цикла. */
function ScannerSweep({ from, to, start, end, y }: { from: number; to: number; start: number; end: number; y: number }) {
  return (
    <g opacity={0}>
      <animate {...shown(start, end + 0.02)} />
      <path d={`M${from} ${y - 16} V${y + 8}`} {...thin(0.9)}>
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`0 0;0 0;${to - from} 0;${to - from} 0`}
          keyTimes={`0;${start};${end};1`}
          dur={`${CYCLE}s`}
          repeatCount="indefinite"
        />
      </path>
    </g>
  );
}

/**
 * Счётчик балла. Первая половина: «=» рядом, число прежнее. Вторая: кольцо
 * пересчёта проворачивается, старое число гаснет, появляется новое.
 */
function ScoreBox() {
  const cx = 196;
  const cy = 76;
  const r = 24;
  const len = 2 * Math.PI * r;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...thin(0.2)} />
      {/* кольцо: полное, во время пересчёта перерисовывается заново */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        {...thin(0.9)}
        strokeLinecap="round"
        strokeDasharray={`${len} ${len}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      >
        <animate
          attributeName="stroke-dashoffset"
          values={`${len * 0.28};${len * 0.28};${len};${len * 0.2};${len * 0.2};${len * 0.28}`}
          keyTimes="0;0.82;0.84;0.94;0.98;1"
          dur={`${CYCLE}s`}
          repeatCount="indefinite"
        />
      </circle>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={17} fontWeight={600} fill={INK} fontFamily={MONO}>
        <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.82;0.84;0.98;1" dur={`${CYCLE}s`} repeatCount="indefinite" />
        72
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={17} fontWeight={600} fill={INK} fontFamily={MONO} opacity={0}>
        <animate {...shown(0.9, 0.98)} />
        78
      </text>
      {/* «=»: оценка подтверждена без изменений */}
      <g opacity={0}>
        <animate {...shown(0.32, 0.5)} />
        <path d={`M${cx - 44} ${cy - 3} h8 M${cx - 44} ${cy + 3} h8`} {...thin(0.9)} />
      </g>
    </g>
  );
}
