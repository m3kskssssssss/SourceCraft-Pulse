// Блок «Мои репозитории» на главной: что получает владелец, подтвердивший
// репозиторий, и ссылка туда. Справа — сцена в стиле планеты: собирается
// подробный отчёт, от основной ветки отходит ветка с правками и вливается
// обратно pull request-ом.
//
// Анимация — SMIL внутри SVG (как у бейджей): работает без клиентского JS,
// компонент остаётся серверным. Всё зациклено на CYCLE секунд.

import Link from 'next/link';

const CYCLE = 6;
const INK = 'var(--ink)';

const thin = (opacity = 0.6) => ({
  fill: 'none',
  stroke: INK,
  strokeWidth: 1,
  strokeOpacity: opacity,
  vectorEffect: 'non-scaling-stroke' as const,
});

/** Отрезок, который проявляется в окне [from, to] доли цикла и держится до конца. */
function reveal(from: number, to: number) {
  return {
    attributeName: 'opacity',
    values: '0;0;1;1',
    keyTimes: `0;${from};${to};1`,
    dur: `${CYCLE}s`,
    repeatCount: 'indefinite',
  };
}

const POINTS = [
  { title: 'Полный отчёт', text: 'с SourceCraft AppSec и прогонами CI — эти данные видны только вам.' },
  { title: 'Pull request с улучшениями', text: 'README, лицензия, правки кода — подготовим, покажем дифф и отправим. Останется принять.' },
  { title: 'Бейдж для README', text: 'пересчитывается каждый день и всегда показывает свежий балл.' },
];

export function ReposPromo() {
  return (
    <div className="grid items-center gap-8 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-10 md:p-10">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">Мои репозитории</div>
        <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight [text-wrap:balance] sm:text-3xl">
          Ваш репозиторий — ваш подробный отчёт
        </h2>
        <ul className="mt-6 grid gap-4">
          {POINTS.map((p, i) => (
            <li key={p.title} className="rise flex gap-3" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--ink)] text-xs font-semibold text-[color:var(--paper)]">
                {i + 1}
              </span>
              <span className="text-[15px] leading-relaxed text-[color:var(--ink-2)]">
                <span className="font-medium text-[color:var(--ink)]">{p.title}</span> — {p.text}
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/repos"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-[color:var(--ink)] px-5 py-2.5 text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)] active:scale-[0.98]"
        >
          Открыть «Мои репозитории» →
        </Link>
      </div>

      <svg viewBox="0 0 240 132" className="block h-auto w-full" role="img" aria-label="Отчёт и pull request с улучшениями">
        <ReportSheet />
        {/* стрелка: отчёт подсказывает, что править */}
        <path d="M100 66 H128" {...thin(0.35)} strokeDasharray="2 3">
          <animate attributeName="stroke-dashoffset" values="10;0" dur="1s" repeatCount="indefinite" />
        </path>
        <path d="M124 62 l4 4 l-4 4" {...thin(0.5)} />
        <PullRequest />
      </svg>
    </div>
  );
}

/** Лист отчёта: кольцо балла заполняется, строки категорий дорисовываются по очереди. */
function ReportSheet() {
  const r = 11;
  const len = 2 * Math.PI * r;
  const bars = [0.8, 0.55, 0.92, 0.4, 0.7];
  return (
    <g>
      <rect x={14} y={12} width={80} height={108} rx={6} {...thin(0.8)} />
      <circle cx={34} cy={34} r={r} {...thin(0.2)} />
      <circle
        cx={34}
        cy={34}
        r={r}
        {...thin(0.9)}
        strokeLinecap="round"
        strokeDasharray={`${len} ${len}`}
        transform="rotate(-90 34 34)"
      >
        <animate
          attributeName="stroke-dashoffset"
          values={`${len};${len};${len * 0.26};${len * 0.26}`}
          keyTimes="0;0.05;0.3;1"
          dur={`${CYCLE}s`}
          repeatCount="indefinite"
        />
      </circle>
      <path d="M52 30 H84 M52 38 H74" {...thin(0.45)} />
      {bars.map((k, i) => {
        const y = 60 + i * 11;
        const from = 0.12 + i * 0.07;
        return (
          <g key={i}>
            <path d={`M24 ${y} H84`} {...thin(0.15)} />
            <path d={`M24 ${y} H${24 + 60 * k}`} {...thin(0.9)} strokeDasharray="60 60">
              <animate
                attributeName="stroke-dashoffset"
                values="60;60;0;0"
                keyTimes={`0;${from};${from + 0.12};1`}
                dur={`${CYCLE}s`}
                repeatCount="indefinite"
              />
            </path>
          </g>
        );
      })}
      <text x={54} y={130} textAnchor="middle" fontSize={6} fill={INK} fillOpacity={0.55} fontFamily="ui-monospace, monospace">
        отчёт
      </text>
    </g>
  );
}

/** Основная ветка, ветка правок и слияние: точка-коммит идёт по ветке и вливается. */
function PullRequest() {
  const branch = 'M146 92 C156 92 156 56 170 56 L204 56 C218 56 218 92 228 92';
  return (
    <g>
      <path d="M138 92 H232" {...thin(0.8)} />
      {[146, 228].map((x) => (
        <circle key={x} cx={x} cy={92} r={3} {...thin(0.9)} fill="var(--paper-2)" />
      ))}
      <path d={branch} {...thin(0.45)} strokeDasharray="2 3" />
      {[176, 190, 204].map((x, i) => (
        <circle key={x} cx={x} cy={56} r={2.6} fill={INK} opacity={0}>
          <animate {...reveal(0.3 + i * 0.08, 0.34 + i * 0.08)} />
        </circle>
      ))}
      {/* плашка PR появляется, когда правки готовы */}
      <g opacity={0}>
        <animate {...reveal(0.58, 0.64)} />
        <rect x={172} y={30} width={30} height={13} rx={6.5} {...thin(0.9)} />
        <text x={187} y={39} textAnchor="middle" fontSize={7} fill={INK} fontFamily="ui-monospace, monospace">
          PR
        </text>
      </g>
      {/* коммит бежит по ветке и вливается в основную */}
      <circle r={2.2} fill={INK}>
        <animateMotion path={branch} dur={`${CYCLE}s`} keyPoints="0;0;1;1" keyTimes="0;0.64;0.9;1" calcMode="linear" repeatCount="indefinite" />
      </circle>
      {/* галочка «принято» после слияния */}
      <path d="M222 74 l3 3 l6 -6" {...thin(0.9)} opacity={0}>
        <animate {...reveal(0.9, 0.94)} />
      </path>
      <text x={185} y={112} textAnchor="middle" fontSize={6} fill={INK} fillOpacity={0.55} fontFamily="ui-monospace, monospace">
        pull request
      </text>
    </g>
  );
}
