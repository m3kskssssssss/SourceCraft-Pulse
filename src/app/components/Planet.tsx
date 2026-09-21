'use client';

// Логотип и фон Pulse — проволочный глобус.
//
// Только линии: параллели неподвижны, меридианы сжимаются и разжимаются по
// косинусу с равномерным сдвигом фаз — так выглядит вращение шара вокруг
// вертикальной оси. Плоскости в нём нет, поэтому он остаётся полутоном и не
// мешает тексту, даже когда занимает половину экрана.
//
// Два размера применения:
//   mark     — знак в шапке и рядом с заголовками;
//   backdrop — крупная фоновая планета за содержимым страницы.
//
// Движение — css-анимация, prefers-reduced-motion останавливает её сам
// (см. globals.css).

export type PlanetProps = {
  /** Сторона квадрата в пикселях. */
  size?: number;
  /** Насколько заметны линии. */
  variant?: 'mark' | 'backdrop';
  className?: string;
};

const R = 30;
const CENTER = 32;
/** Наклон: параллели — сплюснутые эллипсы, глобус смотрит чуть сверху. */
const TILT = 0.26;
/** Высоты параллелей относительно центра. */
const PARALLELS = [-21, -11, 0, 11, 21];
/** Меридианов шесть — этого хватает, чтобы вращение читалось. */
const MERIDIANS = 6;
/** Период полуоборота. Меридианы делят его на равные фазы. */
const SPIN_SECONDS = 16;

export function Planet({ size = 30, variant = 'mark', className }: PlanetProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={variant === 'mark' ? 'img' : 'presentation'}
      aria-label={variant === 'mark' ? 'Планета Pulse' : undefined}
      aria-hidden={variant === 'mark' ? undefined : true}
      className={`planet planet--${variant}${className ? ` ${className}` : ''}`}
    >
      <circle cx={CENTER} cy={CENTER} r={R} className="planet-line planet-rim" />

      {PARALLELS.map((dy) => {
        const rx = Math.sqrt(R * R - dy * dy);
        return (
          <ellipse
            key={`p${dy}`}
            cx={CENTER}
            cy={CENTER + dy}
            rx={rx}
            ry={Math.max(rx * TILT, 0.8)}
            className="planet-line planet-parallel"
          />
        );
      })}

      {Array.from({ length: MERIDIANS }, (_, i) => (
        <ellipse
          key={`m${i}`}
          cx={CENTER}
          cy={CENTER}
          rx={R}
          ry={R}
          className="planet-line planet-meridian"
          // Отрицательная задержка сдвигает фазу, а не откладывает старт:
          // меридианы стартуют «уже повёрнутыми» на свою долю оборота.
          style={{ animationDelay: `${-(SPIN_SECONDS / MERIDIANS) * i}s` }}
        />
      ))}
    </svg>
  );
}
