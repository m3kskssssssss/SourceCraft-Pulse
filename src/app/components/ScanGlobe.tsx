'use client';

// Глобус, который сканируют: картинка для страницы ожидания анализа.
//
// Сделан из того же проволочного глобуса, что и логотип, — чтобы ожидание
// выглядело частью сайта, а не чужим спиннером. Поверх него три слоя:
//   полоса, идущая сверху вниз под круглой маской (чтение файлов);
//   дуга, бегущая по краю (работа идёт);
//   спутник на орбите навстречу дуге (запросы наружу).
//
// Размер задаётся снаружи классами (`w-32 sm:w-44`): оба SVG растянуты на
// весь бокс, поэтому картинка одинаково аккуратна и на телефоне, и на экране.

import { useId } from 'react';
import { Planet } from './Planet';

export function ScanGlobe({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const clipId = `scan-clip-${uid}`;

  return (
    <div className={`relative aspect-square shrink-0${className ? ` ${className}` : ''}`}>
      <Planet size={64} variant="mark" className="absolute inset-0 h-full w-full" />

      <svg
        viewBox="0 0 64 64"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="32" cy="32" r="30" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect className="scan-sweep" x="0" y="-9" width="64" height="9" />
        </g>

        <circle className="scan-arc" cx="32" cy="32" r="30" />

        <g className="scan-orbit">
          <circle className="scan-blip" cx="62" cy="32" r="2.1" />
        </g>
      </svg>
    </div>
  );
}
