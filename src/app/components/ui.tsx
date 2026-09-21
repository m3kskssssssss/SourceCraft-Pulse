// Минимальный набор UI-примитивов для чёрно-белой темы Pulse.
// Никаких внешних зависимостей и variants API — вручную составленные классы.

import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes } from 'react';

// ---------- utility ----------

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ---------- Button ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium ' +
  'transition duration-150 active:scale-[0.97] ' +
  'disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[color:var(--ink)] text-[color:var(--paper)] hover:bg-[color:var(--ink-2)] active:translate-y-px',
  secondary:
    'bg-[color:var(--panel)] text-[color:var(--ink)] hover:bg-[color:var(--panel-2)]',
  ghost:
    'border border-[color:var(--line)] text-[color:var(--ink)] hover:bg-[color:var(--panel)]',
  link: 'text-[color:var(--ink)] underline underline-offset-4 hover:no-underline p-0 rounded-none',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-sm px-5 py-3',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      {...rest}
      className={cx(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        variant !== 'link' && BUTTON_SIZES[size],
        className,
      )}
    />
  );
}

// ---------- Input ----------

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cx(
        'w-full rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-[15px]',
        'placeholder:text-[color:var(--muted-2)] outline-none',
        'border border-transparent focus:border-[color:var(--ink)]',
        'transition',
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label {...rest} className={cx('flex flex-col gap-1.5 text-sm', className)}>
      <span className="text-[color:var(--ink-2)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[color:var(--muted)]">{hint}</span>}
    </label>
  );
}

// ---------- Card / Panel ----------

type CardTone = 'panel' | 'outline' | 'paper';

const CARD_TONES: Record<CardTone, string> = {
  panel: 'bg-[color:var(--panel)]',
  outline: 'bg-[color:var(--paper)] border border-[color:var(--line)]',
  paper: 'bg-[color:var(--paper-2)] border border-[color:var(--line)]',
};

export function Card({
  className,
  children,
  tone = 'panel',
}: {
  className?: string;
  children: ReactNode;
  tone?: CardTone;
}) {
  return (
    <section className={cx('rounded-3xl p-6', CARD_TONES[tone], className)}>
      {children}
    </section>
  );
}

export function CardDiv({
  className,
  children,
  tone = 'panel',
}: {
  className?: string;
  children: ReactNode;
  tone?: CardTone;
}) {
  return (
    <div className={cx('rounded-3xl p-6', CARD_TONES[tone], className)}>
      {children}
    </div>
  );
}

// ---------- Chip ----------

export function Chip({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: 'default' | 'ink' | 'outline' | 'accent';
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: 'bg-[color:var(--panel)] text-[color:var(--ink-2)]',
    ink: 'bg-[color:var(--ink)] text-[color:var(--paper)]',
    outline: 'border border-[color:var(--line-2)] text-[color:var(--ink-2)]',
    // Цвет берём из --accent блока категории.
    accent:
      'bg-[color:var(--accent-soft,var(--panel))] text-[color:var(--accent,var(--ink-2))]',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------- ScoreDial ----------
// Круговой индикатор 0–100. SVG. Заливка — сплошная тёмная дуга поверх серого кольца.

export function ScoreDial({
  value,
  size = 96,
  stroke = 8,
  label,
  animated = true,
}: {
  value: number | null | undefined;
  size?: number;
  stroke?: number;
  label?: string;
  animated?: boolean;
}) {
  const clamped = value == null ? 0 : Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (c * clamped) / 100;
  const style = animated
    ? ({
        ['--dial-start' as string]: c,
        ['--dial-end' as string]: dashOffset,
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={label ?? `оценка ${value ?? 'нет данных'}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={value == null ? 'var(--line-2)' : 'var(--ink)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          className={animated ? 'dial-anim' : undefined}
          style={style}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold tabular-nums leading-none"
          style={{ fontSize: size * 0.32 }}
        >
          {value ?? '—'}
        </span>
        {label && (
          <span
            className="mt-1 uppercase tracking-widest text-[color:var(--muted)]"
            style={{ fontSize: Math.max(9, size * 0.09) }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------- Bar ----------
// Горизонтальная полоска 0–100. Для карточек метрик и категорий.

export function Bar({
  value,
  className,
  height = 6,
  muted = false,
  accent = false,
}: {
  value: number | null | undefined;
  className?: string;
  height?: number;
  muted?: boolean;
  /** Красить в --accent родителя (класс accent-*), а не в чёрный. */
  accent?: boolean;
}) {
  const clamped = value == null ? 0 : Math.max(0, Math.min(100, value));
  const empty = value == null || muted;
  return (
    <div
      className={cx('w-full overflow-hidden rounded-full bg-[color:var(--line)]', className)}
      style={{ height }}
    >
      <div
        className={cx(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          empty && 'bg-[color:var(--line-2)]',
        )}
        style={{
          width: `${clamped}%`,
          background: empty
            ? undefined
            : accent
              ? 'var(--accent, var(--ink))'
              : 'var(--ink)',
        }}
      />
    </div>
  );
}

// ---------- EmptyState ----------

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[color:var(--line-2)] px-8 py-12 text-center',
        className,
      )}
    >
      <div className="text-lg font-medium">{title}</div>
      {hint && <div className="max-w-md text-sm text-[color:var(--muted)]">{hint}</div>}
      {action}
    </div>
  );
}

// ---------- Stat ----------
// Карточка «метка → большое число», используется в админке и на карточках.

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('rounded-2xl bg-[color:var(--panel)] p-4', className)}>
      <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-[color:var(--muted)]">{hint}</div>}
    </div>
  );
}
