'use client';

// Зацикленная 8-битная сцена. Холст рисуется в родном разрешении 120×60 и
// растягивается CSS с image-rendering: pixelated — пиксели остаются чёткими
// на любом экране. Вне экрана анимация стоит, при «уменьшении движения»
// показывается один осмысленный кадр.

import { useEffect, useRef } from 'react';
import type { SceneId } from '@/lib/learn/types';
import { FPS, SCENES, SH, SW } from './scenes';

export function PixelScene({ scene, className }: { scene: SceneId; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const s = SCENES[scene];

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      s.draw(ctx, s.still);
      return;
    }

    let frame = 0;
    let raf = 0;
    let last = 0;
    let visible = false;
    s.draw(ctx, frame);

    const tick = (now: number): void => {
      if (!visible) return;
      if (now - last >= 1000 / FPS) {
        last = now;
        frame = (frame + 1) % s.frames;
        s.draw(ctx, frame);
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
  }, [scene]);

  return (
    <canvas
      ref={ref}
      width={SW}
      height={SH}
      aria-hidden="true"
      className={className}
      style={{ imageRendering: 'pixelated', background: '#0a0a0a', width: '100%', height: 'auto', aspectRatio: `${SW} / ${SH}`, display: 'block' }}
    />
  );
}
