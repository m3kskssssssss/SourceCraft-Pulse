'use client';

// Логотип Pulse — пингвин.
//
// Живой: зрачки следят за курсором, изредка моргает, на наведение поднимает
// крылья, по клику подпрыгивает. Всё движение — css-переходы и keyframes,
// поэтому системная настройка «меньше движения» гасит его автоматически
// (см. globals.css).
//
// Цвета берём из токенов темы: тело — чернила, живот — бумага, клюв и лапы —
// единственное цветное пятно на сайте (токен --beak).

import { useCallback, useEffect, useRef, useState } from 'react';

export type PenguinProps = {
  /** Сторона квадрата в пикселях. */
  size?: number;
  /** Следить за курсором и реагировать на клик. */
  interactive?: boolean;
  className?: string;
};

/** Насколько далеко зрачок отходит от центра глаза, в единицах viewBox. */
const PUPIL_RANGE = 1.3;

export function Penguin({ size = 28, interactive = true, className }: PenguinProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [hop, setHop] = useState(false);

  useEffect(() => {
    if (!interactive) return;

    const onMove = (event: PointerEvent) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      // Далеко от логотипа взгляд уже «уткнулся» в край глаза — нормируем.
      const reach = Math.min(1, distance / 260);
      setPupil({
        x: (dx / distance) * PUPIL_RANGE * reach,
        y: (dy / distance) * PUPIL_RANGE * reach,
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [interactive]);

  const onHop = useCallback(() => {
    if (!interactive) return;
    setHop(true);
    window.setTimeout(() => setHop(false), 620);
  }, [interactive]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Пингвин Pulse"
      onClick={onHop}
      className={`penguin${hop ? ' penguin-hop' : ''}${className ? ` ${className}` : ''}`}
    >
      {/* Крылья рисуем до тела: наружу торчит только край. */}
      <ellipse className="penguin-wing penguin-wing-left" cx="15.5" cy="39" rx="3.8" ry="11" />
      <ellipse className="penguin-wing penguin-wing-right" cx="48.5" cy="39" rx="3.8" ry="11" />

      {/* Лапы. */}
      <g className="penguin-feet">
        <ellipse cx="25.5" cy="58.6" rx="5" ry="2.6" />
        <ellipse cx="38.5" cy="58.6" rx="5" ry="2.6" />
      </g>

      {/* Тело и голова — два силуэта, живот и морда поверх них. */}
      <ellipse cx="32" cy="40" rx="16" ry="18" fill="var(--ink)" />
      <circle cx="32" cy="19" r="12.5" fill="var(--ink)" />
      <ellipse cx="32" cy="43" rx="10.5" ry="13" fill="var(--paper)" />
      <ellipse cx="32" cy="21" rx="9.2" ry="8.2" fill="var(--paper)" />

      {/* Глаза: зрачок ездит за курсором в пределах белка. */}
      <g className="penguin-eyes">
        <circle cx="27.6" cy="19.5" r="3.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="0.7" />
        <circle cx="36.4" cy="19.5" r="3.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="0.7" />
        <circle cx={27.6 + pupil.x} cy={19.5 + pupil.y} r="1.8" fill="var(--ink)" />
        <circle cx={36.4 + pupil.x} cy={19.5 + pupil.y} r="1.8" fill="var(--ink)" />
      </g>

      {/* Веки — опускаются только в момент моргания. */}
      <g className="penguin-lids">
        <circle cx="27.6" cy="19.5" r="3.8" fill="var(--ink)" />
        <circle cx="36.4" cy="19.5" r="3.8" fill="var(--ink)" />
      </g>

      {/* Клюв. */}
      <path d="M32 23.8 L35 26.6 L29 26.6 Z" fill="var(--beak)" />
    </svg>
  );
}
