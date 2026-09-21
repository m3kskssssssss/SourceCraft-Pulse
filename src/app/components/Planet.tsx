'use client';

// Логотип Pulse — планета.
//
// Вращение сделано не поворотом (в SVG нет третьей оси), а сдвигом «карты»
// под круглой маской: три одинаковые копии рельефа едут влево, и на стыке
// картинка совпадает сама с собой — шов не виден.
//
// Всё полупрозрачное: планета не спорит с текстом, а просто живёт в углу.
// Движение — css-анимация, поэтому prefers-reduced-motion гасит его сам.

import { useId } from 'react';

export type PlanetProps = {
  /** Сторона квадрата в пикселях. */
  size?: number;
  className?: string;
};

/** Ширина одной копии рельефа в единицах viewBox. Совпадает с шагом анимации. */
const MAP_WIDTH = 44;

export function Planet({ size = 30, className }: PlanetProps) {
  // id нужен уникальный: логотип на странице встречается не один раз.
  const uid = useId().replace(/:/g, '');
  const clipId = `planet-clip-${uid}`;
  const mapId = `planet-map-${uid}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Планета Pulse"
      className={`planet${className ? ` ${className}` : ''}`}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="22" />
        </clipPath>

        {/* Рельеф одной копии: параллели и несколько «материков». */}
        <g id={mapId}>
          {/* Параллели слегка изогнуты, меридианы наклонены — сетка глобуса.
              Концы линий у соседних копий совпадают по высоте, иначе на стыке
              появился бы излом. */}
          <path d="M0 20 Q22 16.5 44 20" className="planet-parallel" />
          <path d="M0 32 H44" className="planet-parallel" />
          <path d="M0 44 Q22 47.5 44 44" className="planet-parallel" />
          <path d="M11 8 Q14 32 11 56" className="planet-meridian" />
          <path d="M33 8 Q36 32 33 56" className="planet-meridian" />
          <path d="M10 27 q5 -4 10 -1 q5 3 1 6 q-6 4 -11 0 z" className="planet-land" />
          <path d="M27 38 q7 -5 12 0 q3 4 -3 6 q-8 2 -9 -2 z" className="planet-land" />
          <ellipse cx="36" cy="22" rx="5" ry="3" className="planet-land" />
        </g>
      </defs>

      {/* Орбита — единственная линия, выходящая за диск. */}
      <ellipse
        cx="32"
        cy="32"
        rx="30"
        ry="10.5"
        className="planet-orbit"
        transform="rotate(-18 32 32)"
      />

      {/* Сам диск: почти прозрачная заливка, чтобы сквозь него читался фон. */}
      <circle cx="32" cy="32" r="22" className="planet-disc" />

      <g clipPath={`url(#${clipId})`}>
        <g className="planet-spin">
          <use href={`#${mapId}`} x="0" />
          <use href={`#${mapId}`} x={MAP_WIDTH} />
          <use href={`#${mapId}`} x={MAP_WIDTH * 2} />
        </g>
        {/* Затенение у правого края — намёк на шар, а не блин. */}
        <ellipse cx="46" cy="32" rx="16" ry="22" className="planet-shade" />
      </g>

      <circle cx="32" cy="32" r="22" className="planet-rim" />
      <ellipse
        cx="24"
        cy="23"
        rx="6.5"
        ry="4.4"
        className="planet-glare"
        transform="rotate(-28 24 23)"
      />
    </svg>
  );
}
