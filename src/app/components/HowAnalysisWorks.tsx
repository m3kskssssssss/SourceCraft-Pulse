'use client';

// «Как проходит оценка»: сцена в стиле логотипа на каждый шаг прогона, шаги
// идут по кругу. Под сценой — полоса прогресса по шагам и описание текущего,
// ниже — список, по которому можно перейти к любому шагу.
//
// Время идёт в requestAnimationFrame, картинка перерисовывается около 30 раз
// в секунду и только пока блок на экране. При «уменьшении движения» шаги
// переключаются только руками, а сцена стоит на выразительном моменте.

import { useEffect, useRef, useState } from 'react';
import { PROCESS_STEPS, STEP_SECONDS, VIEW_H, VIEW_W } from './process-scenes';
import { cx } from './ui';

const TOTAL = PROCESS_STEPS.length * STEP_SECONDS;
/** С какого момента показывать шаг, выбранный кликом: начало часто пустое. */
const JUMP_AT = 0.55;

export function HowAnalysisWorks() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(STEP_SECONDS * JUMP_AT);
  const [time, setTime] = useState(STEP_SECONDS * JUMP_AT);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

  const step = Math.floor(time / STEP_SECONDS) % PROCESS_STEPS.length;
  const local = time - step * STEP_SECONDS;
  const current = PROCESS_STEPS[step] ?? PROCESS_STEPS[0]!;
  const Scene = current.Scene;

  const jump = (index: number): void => {
    timeRef.current = index * STEP_SECONDS + STEP_SECONDS * JUMP_AT;
    setTime(timeRef.current);
  };

  return (
    <section aria-labelledby="how-title">
      <h2 id="how-title" className="text-2xl font-semibold tracking-tight">
        Как проходит оценка
      </h2>
      <p className="mt-1.5 text-sm text-[color:var(--muted)]">
        Всё считается в одном запросе. Пока идёт прогон, страница анализа показывает, на каком он шаге.
      </p>

      <div
        ref={rootRef}
        className="mt-5 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]"
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Шаг ${step + 1}: ${current.title}`}
        >
          <Scene t={local} />
        </svg>

        {/* Полоса по шагам: пройденные закрашены, текущий заполняется. */}
        <div className="flex gap-1 px-5 sm:px-6">
          {PROCESS_STEPS.map((s, i) => (
            <div key={s.key} className="h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--line)]">
              <div
                className="h-full bg-[color:var(--ink)]"
                style={{ width: i < step ? '100%' : i === step ? `${(local / STEP_SECONDS) * 100}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Высота текста — по самому длинному описанию, чтобы блок не прыгал. */}
        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6" aria-live="polite">
          <div className="text-xs tabular-nums text-[color:var(--muted)]">
            Шаг {step + 1} из {PROCESS_STEPS.length}
          </div>
          <div className="mt-1 text-lg font-semibold tracking-tight">{current.title}</div>
          <p className="mt-2 min-h-[10rem] text-[15px] leading-relaxed text-[color:var(--ink-2)] sm:min-h-[6.5rem]">
            {current.text}
          </p>
        </div>
      </div>

      <ol className="mt-4 flex flex-wrap gap-2">
        {PROCESS_STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => jump(i)}
              aria-current={i === step ? 'step' : undefined}
              className={cx(
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition',
                i === step
                  ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
                  : 'bg-[color:var(--panel)] text-[color:var(--ink-2)] hover:bg-[color:var(--panel-2)]',
              )}
            >
              <span className="tabular-nums opacity-60">{i + 1}</span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
