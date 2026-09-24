'use client';

// «Как проходит оценка»: 8-битная сцена на каждый шаг прогона, шаги идут по
// кругу. Под сценой — полоса прогресса по шагам и описание текущего, ниже —
// список, по которому можно перейти к любому шагу.
//
// Кадр живёт в ref и рисуется в requestAnimationFrame; React перерисовывается
// только при смене шага, чтобы текст не дёргался 12 раз в секунду. Вне экрана
// анимация стоит, при «уменьшении движения» шаги переключаются только руками.

import { useCallback, useEffect, useRef, useState } from 'react';
import { FPS } from './learn/scenes';
import { PROCESS_H, PROCESS_STEPS, PROCESS_W, STEP_FRAMES } from './process-scenes';
import { cx } from './ui';

const TOTAL = PROCESS_STEPS.length * STEP_FRAMES;

export function HowAnalysisWorks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const [step, setStep] = useState(0);

  const paint = useCallback((frame: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const index = Math.floor(frame / STEP_FRAMES) % PROCESS_STEPS.length;
    PROCESS_STEPS[index]?.draw(ctx, frame % STEP_FRAMES);
    if (barRef.current) barRef.current.style.width = `${((frame % STEP_FRAMES) / (STEP_FRAMES - 1)) * 100}%`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paint(frameRef.current);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let last = 0;
    let visible = false;
    const tick = (now: number): void => {
      if (!visible) return;
      if (now - last >= 1000 / FPS) {
        last = now;
        const next = (frameRef.current + 1) % TOTAL;
        frameRef.current = next;
        paint(next);
        const index = Math.floor(next / STEP_FRAMES);
        setStep((current) => (current === index ? current : index));
      }
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(tick);
    });
    io.observe(canvas);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [paint]);

  const jump = (index: number): void => {
    // С середины сцены: начало у многих шагов почти пустое.
    const frame = index * STEP_FRAMES + Math.floor(STEP_FRAMES * 0.55);
    frameRef.current = frame;
    setStep(index);
    paint(frame);
  };

  const current = PROCESS_STEPS[step] ?? PROCESS_STEPS[0]!;

  return (
    <section aria-labelledby="how-title">
      <h2 id="how-title" className="text-2xl font-semibold tracking-tight">
        Как проходит оценка
      </h2>
      <p className="mt-1.5 text-sm text-[color:var(--muted)]">
        Всё считается в одном запросе. Пока идёт прогон, страница анализа показывает, на каком он шаге.
      </p>

      <div className="mt-5 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
        <canvas
          ref={canvasRef}
          width={PROCESS_W}
          height={PROCESS_H}
          aria-hidden="true"
          className="block w-full bg-[#0a0a0a]"
          style={{ imageRendering: 'pixelated', aspectRatio: `${PROCESS_W} / ${PROCESS_H}` }}
        />

        {/* Полоса по шагам: пройденные закрашены, текущий заполняется. */}
        <div className="flex gap-1 px-5 pt-4 sm:px-6">
          {PROCESS_STEPS.map((s, i) => (
            <div key={s.key} className="h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--line)]">
              {i < step && <div className="h-full w-full bg-[color:var(--ink)]" />}
              {i === step && <div ref={barRef} className="h-full w-0 bg-[color:var(--ink)]" />}
            </div>
          ))}
        </div>

        {/* Высота текста фиксирована по самому длинному описанию, чтобы блок
            не прыгал при смене шага. */}
        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6" aria-live="polite">
          <div className="text-xs tabular-nums text-[color:var(--muted)]">
            Шаг {step + 1} из {PROCESS_STEPS.length}
          </div>
          <div className="mt-1 text-lg font-semibold tracking-tight">{current.title}</div>
          <p className="mt-2 min-h-[7.5rem] text-[15px] leading-relaxed text-[color:var(--ink-2)] sm:min-h-[5rem]">
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
