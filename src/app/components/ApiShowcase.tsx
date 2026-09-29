'use client';

// «Pulse по API» на главной: четыре публичных запроса по кругу. Слева —
// терминал, где набирается curl и приходит ответ, справа — сцена в стиле
// планеты: запрос уходит к проволочному глобусу по верхней дуге, тот
// «думает», ответ возвращается по нижней.
//
// Время идёт в requestAnimationFrame около 30 раз в секунду и только пока
// блок на экране. При «уменьшении движения» каждый запрос показан целиком и
// переключается только руками. Ответы — примеры формы, а не живые данные.

import { useEffect, useRef, useState } from 'react';
import { Globe, bezier, easeOut, prog, thin } from './process-scenes';
import { cx } from './ui';

const SCENE_SECONDS = 8.5;
const T_TYPED = 2.4;
const T_SENT = 3.4;
const T_DONE = 4.4;
const T_BACK = 5.2;
const T_SHOWN = 6.8;

type Endpoint = {
  key: string;
  tab: string;
  method: 'GET' | 'POST';
  path: string;
  /** Подпись над дугой запроса в сцене — короткая. */
  label: string;
  status: string;
  command: string[];
  response: string[];
  text: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    key: 'analyze',
    tab: 'Оценить',
    method: 'POST',
    path: '/api/public/analyze',
    label: 'POST /analyze',
    status: '200 OK',
    command: [
      '$ curl -X POST $PULSE/api/public/analyze \\',
      "    -H 'content-type: application/json' \\",
      `    -d '{"repo":"ilugly/unit-converter"}'`,
    ],
    response: [
      '{',
      '  "cached": false,',
      '  "report": {',
      '    "repository": { "org": "ilugly", "repo": "unit-converter" },',
      '    "score": 74,',
      '    "coverage": 0.833,',
      '    "categories": [ { "key": "code", "score": 81, … } ],',
      '    "recommendations": [ … ]',
      '  }',
      '}',
    ],
    text:
      'Клонирует публичный репозиторий, считает оценку прямо в запросе и отвечает готовым отчётом — обычно за полминуты–минуту. ' +
      'Отчёт моложе 12 часов приходит сразу, без нового прогона; если оценка уже идёт — 202 и statusUrl для опроса. ' +
      'Новых прогонов — не больше пяти в час с одного адреса.',
  },
  {
    key: 'report',
    tab: 'Отчёт',
    method: 'GET',
    path: '/api/public/repos/{org}/{repo}/report',
    label: 'GET /report',
    status: '200 OK',
    command: ['$ curl $PULSE/api/public/repos/\\', '    ilugly/unit-converter/report'],
    response: [
      '{',
      '  "score": 74,',
      '  "analyzedAt": "2026-09-27T09:12:40Z",',
      '  "categories": [',
      '    { "key": "code", "title": "Код", "weightPercent": 20,',
      '      "score": 81, "metrics": [ … ] },',
      '    …',
      '  ],',
      '  "penalties": [ … ], "recommendations": [ … ]',
      '}',
    ],
    text:
      'Полный разбор последней опубликованной оценки: категории с весами, метрики, штрафы и рекомендации. ' +
      'С ?format=md тот же отчёт приходит Markdown-документом. Короткая карточка без метрик — /api/public/repos/{org}/{repo}.',
  },
  {
    key: 'leaderboard',
    tab: 'Рейтинг',
    method: 'GET',
    path: '/api/public/leaderboard',
    label: 'GET /leaderboard',
    status: '200 OK',
    command: ["$ curl '$PULSE/api/public/leaderboard\\", "    ?sort=score&lang=Python&limit=3'"],
    response: [
      '{',
      '  "items": [',
      '    { "org": "…", "repo": "…", "score": 92, "language": "Python",',
      '      "categories": { "code": 88, "docs": 95, … } },',
      '    …',
      '  ],',
      '  "total": 128, "limit": 3, "offset": 0',
      '}',
    ],
    text:
      'Тот же рейтинг, что на сайте: sort=score (балл), likes (лайки SourceCraft), activity (последняя активность) или forks (отзывы людей), поиск q, языки через запятую, ' +
      'limit до 100 и offset. Не больше 60 запросов в минуту с одного адреса.',
  },
  {
    key: 'badge',
    tab: 'Бейдж',
    method: 'GET',
    path: '/api/badge/{org}/{repo}.svg',
    label: 'GET /badge.svg',
    status: '200 OK',
    command: ['$ curl -I $PULSE/api/badge/\\', '    ilugly/unit-converter.svg'],
    response: [
      'HTTP/2 200',
      'content-type: image/svg+xml',
      'etag: "…"',
      '',
      '# в README:',
      '![Pulse]($PULSE/api/badge/ilugly/unit-converter.svg)',
    ],
    text:
      'SVG-бейдж с баллом последней публичной оценки — для README. Карточка побольше, с категориями и языком, — ' +
      '/api/card/{org}/{repo}.svg. Оба отдаются без кэша, по ETag: после переоценки бейдж сразу свежий.',
  },
];

const TOTAL = ENDPOINTS.length * SCENE_SECONDS;
/** Длина команды в символах — от неё скорость набора. */
const commandLength = (e: Endpoint): number => e.command.reduce((n, line) => n + line.length, 0);

export function ApiShowcase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const reducedRef = useRef(false);
  const [time, setTime] = useState(0);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reducedRef.current = true;
      timeRef.current = SCENE_SECONDS - 0.01;
      setTime(timeRef.current);
      return;
    }

    let raf = 0;
    let last = 0;
    let visible = false;
    const tick = (now: number): void => {
      if (!visible) return;
      if (last === 0) last = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      if (dt >= 1 / 30) {
        last = now;
        timeRef.current = (timeRef.current + dt) % TOTAL;
        setTime(timeRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      cancelAnimationFrame(raf);
      last = 0;
      if (visible) raf = requestAnimationFrame(tick);
    });
    io.observe(root);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const index = Math.floor(time / SCENE_SECONDS) % ENDPOINTS.length;
  const local = time - index * SCENE_SECONDS;
  const current = ENDPOINTS[index] ?? ENDPOINTS[0]!;

  const jump = (i: number): void => {
    timeRef.current = i * SCENE_SECONDS + (reducedRef.current ? SCENE_SECONDS - 0.01 : 0);
    setTime(timeRef.current);
  };

  // Сколько символов команды уже «набрано» и сколько строк ответа пришло.
  const typed = Math.floor(prog(local, 0.2, T_TYPED) * commandLength(current));
  const shownLines = Math.floor(prog(local, T_BACK, T_SHOWN) * current.response.length + 0.001);
  const waiting = local >= T_TYPED && local < T_BACK;

  let budget = typed;
  const commandLines = current.command.map((line) => {
    const part = line.slice(0, Math.max(0, budget));
    budget -= line.length;
    return part;
  });
  const cursorLine = Math.min(
    current.command.length - 1,
    commandLines.findIndex((part, i) => part.length < (current.command[i]?.length ?? 0)),
  );

  return (
    <section aria-labelledby="api-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="api-title" className="text-3xl font-semibold tracking-tight">
            Pulse по API
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[color:var(--muted)]">
            Всё, что видно на сайте, отдаётся и JSON-ом: без ключей и регистрации, для CI, ботов и README.
          </p>
        </div>
      </div>

      <div
        ref={rootRef}
        className="mt-6 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]"
      >
        <div className="flex gap-1 overflow-x-auto border-b border-[color:var(--line)] p-2" role="tablist">
          {ENDPOINTS.map((e, i) => (
            <button
              key={e.key}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => jump(i)}
              className={cx(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm transition',
                i === index
                  ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
                  : 'text-[color:var(--ink-2)] hover:bg-[color:var(--panel)]',
              )}
            >
              <span className="font-mono text-[10px] tracking-wide opacity-70">{e.method}</span>
              {e.tab}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Терминал: высота постоянная, чтобы блок не прыгал между запросами. */}
          <div className="min-w-0 border-b border-[color:var(--line)] p-4 md:border-b-0 md:border-r sm:p-5">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-[color:var(--line-2)]" />
              <span className="h-2 w-2 rounded-full bg-[color:var(--line-2)]" />
              <span className="h-2 w-2 rounded-full bg-[color:var(--line-2)]" />
              <span className="ml-2 truncate font-mono text-[11px] text-[color:var(--muted-2)]">
                {current.method} {current.path}
              </span>
            </div>
            <pre className="mt-3 h-[16.5rem] overflow-x-auto sm:h-[19rem] overflow-y-hidden font-mono text-[11.5px] leading-[1.55] sm:text-[12px]">
              <code>
                {commandLines.map((part, i) => (
                  <span key={`c${i}`} className="block text-[color:var(--ink)]">
                    {part}
                    {i === cursorLine && local < T_TYPED + 0.2 && (
                      <span className="caret ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[0.15em] bg-[color:var(--ink)]" />
                    )}
                    {part.length === 0 && ' '}
                  </span>
                ))}
                <span className="block"> </span>
                {waiting && (
                  <span className="block text-[color:var(--muted)]">
                    {['ждём ответ .', 'ждём ответ ..', 'ждём ответ ...'][Math.floor(local * 4) % 3]}
                  </span>
                )}
                {current.response.slice(0, shownLines).map((line, i) => (
                  <span key={`r${i}`} className="api-line block">
                    <JsonLine line={line} />
                  </span>
                ))}
              </code>
            </pre>
          </div>

          <div className="flex min-w-0 flex-col">
            <svg viewBox="0 0 240 120" className="block h-auto w-full" role="img" aria-label={`${current.method} ${current.path}`}>
              <ApiFlow t={local} endpoint={current} />
            </svg>
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="text-xs tabular-nums text-[color:var(--muted)]">
                Запрос {index + 1} из {ENDPOINTS.length}
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--ink-2)] md:min-h-[9rem]">{current.text}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 px-4 pb-4 sm:px-5">
          {ENDPOINTS.map((e, i) => (
            <div key={e.key} className="h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--line)]">
              <div
                className="h-full bg-[color:var(--ink)]"
                style={{ width: i < index ? '100%' : i === index ? `${(local / SCENE_SECONDS) * 100}%` : '0%' }}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-[color:var(--muted)]">
        <span className="font-mono">$PULSE</span> — адрес этого сайта
        {origin ? (
          <>
            : <span className="font-mono text-[color:var(--ink-2)]">{origin}</span>
          </>
        ) : null}
        . Ответы выше — примеры формы, не живые данные.
      </p>
    </section>
  );
}

/** Строка JSON: ключи приглушены, значения — основным цветом. */
function JsonLine({ line }: { line: string }) {
  if (line.startsWith('#')) return <span className="text-[color:var(--muted)]">{line}</span>;
  const parts = line.split(/("[^"]*"\s*:)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^"[^"]*"\s*:$/.test(p) ? (
          <span key={i} className="text-[color:var(--muted)]">
            {p}
          </span>
        ) : (
          <span key={i} className="text-[color:var(--ink)]">
            {p || (i === 0 && parts.length === 1 ? ' ' : '')}
          </span>
        ),
      )}
    </>
  );
}

/**
 * Сцена запроса: слева клиент-терминал, справа проволочный глобус Pulse.
 * Запрос — точка по верхней дуге, ответ — кольцо по нижней.
 */
function ApiFlow({ t, endpoint }: { t: number; endpoint: Endpoint }) {
  const from: [number, number] = [62, 54];
  const to: [number, number] = [150, 52];
  const backFrom: [number, number] = [150, 68];
  const backTo: [number, number] = [62, 66];
  const up: [number, number] = [106, 14];
  const down: [number, number] = [106, 106];

  const send = prog(t, T_TYPED, T_SENT);
  const think = prog(t, T_SENT, T_DONE);
  const back = prog(t, T_DONE, T_BACK);
  const answered = t >= T_BACK;
  const sending = send > 0 && send < 1;
  const returning = back > 0 && back < 1;
  // Пока глобус думает, он крутится быстрее.
  const spin = t + (think > 0 ? easeOut(think) * 3 : 0) + (t >= T_DONE ? 3 : 0);

  const typing = t < T_TYPED;
  return (
    <g>
      {/* Клиент: окно терминала с мигающим курсором */}
      <g {...thin(0.8)}>
        <rect x={18} y={44} width={40} height={30} rx={3} />
        <path d="M18 50 H58" strokeOpacity={0.4} />
      </g>
      <path d="M24 58 l4 3 l-4 3" {...thin(0.8)} />
      {(typing ? Math.floor(t * 3) % 2 === 0 : true) && (
        <path d={`M31 65 H${typing ? 36 + (t / T_TYPED) * 14 : 50}`} {...thin(0.8)} />
      )}
      <text x={38} y={86} textAnchor="middle" fontSize={6} fill="var(--ink)" fillOpacity={0.6} fontFamily="ui-monospace, monospace">
        curl
      </text>

      <Globe cx={188} cy={60} r={32} t={spin} period={10} />
      <ellipse cx={188} cy={60} rx={46} ry={12} {...thin(0.3, '2 3')} />
      <circle cx={188 + 46 * Math.cos(spin * 1.2)} cy={60 + 12 * Math.sin(spin * 1.2)} r={1.6} fill="var(--ink)" />
      <text x={188} y={108} textAnchor="middle" fontSize={6} fill="var(--ink)" fillOpacity={0.6} fontFamily="ui-monospace, monospace">
        Pulse
      </text>

      {/* Волны «думает» */}
      {think > 0 &&
        t < T_DONE + 0.4 &&
        [0, 0.5].map((shift) => {
          const k = ((think + shift) % 1) * (t < T_DONE ? 1 : 0.999);
          return (
            <circle key={shift} cx={188} cy={60} r={32 + k * 16} {...thin((1 - k) * 0.5)} />
          );
        })}

      {/* Дуги: запрос сверху, ответ снизу */}
      <path d={`M${from[0]} ${from[1]} Q ${up[0]} ${up[1]} ${to[0]} ${to[1]}`} {...thin(0.3, '2 3')} />
      <path d={`M${backFrom[0]} ${backFrom[1]} Q ${down[0]} ${down[1]} ${backTo[0]} ${backTo[1]}`} {...thin(0.3, '2 3')} />

      <text
        x={up[0]}
        y={30}
        textAnchor="middle"
        fontSize={6.5}
        fill="var(--ink)"
        fillOpacity={t >= T_TYPED ? 0.85 : 0.35}
        fontFamily="ui-monospace, monospace"
      >
        {endpoint.label}
      </text>
      <text
        x={down[0]}
        y={96}
        textAnchor="middle"
        fontSize={6.5}
        fill="var(--ink)"
        fillOpacity={answered ? 0.85 : 0}
        fontFamily="ui-monospace, monospace"
      >
        {endpoint.status}
      </text>

      {sending &&
        [0, 0.08, 0.16].map((lag, i) => {
          const k = easeOut(Math.max(0, send - lag));
          const [x, y] = bezier(k, from, up, to);
          return <circle key={i} cx={x} cy={y} r={i === 0 ? 2 : 1.2} fill="var(--ink)" fillOpacity={1 - i * 0.3} />;
        })}
      {returning &&
        [0, 0.08, 0.16].map((lag, i) => {
          const k = easeOut(Math.max(0, back - lag));
          const [x, y] = bezier(k, backFrom, down, backTo);
          return <circle key={i} cx={x} cy={y} r={i === 0 ? 2.6 : 1.4} {...thin(0.9 - i * 0.3)} />;
        })}
      {/* Ответ пришёл: клиент «подсвечен» галочкой */}
      {answered && <path d="M44 38 l3 3 l6 -6" {...thin(0.9)} />}
    </g>
  );
}
