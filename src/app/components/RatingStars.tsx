'use client';

// Оценка анализа: пять звёзд сразу под баллом.
//
// Звезда отправляет форму сама, без отдельной кнопки «сохранить»: лишний шаг
// здесь никому не нужен. Гостю звёзды видно, но они не нажимаются — вместо
// подсказки после клика честнее сказать заранее.

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { rateAnalysisAction, type SocialState } from '@/app/actions/social';
import { MAX_RATING } from '@/lib/social-shared';
import { cx } from './ui';

const INITIAL: SocialState = { ok: true };

export function RatingStars({
  analysisId,
  average,
  count,
  mine,
  canRate,
}: {
  analysisId: string;
  average: number | null;
  count: number;
  mine: number | null;
  canRate: boolean;
}) {
  const [state, formAction, pending] = useActionState(rateAnalysisAction, INITIAL);
  const [value, setValue] = useState<number | null>(mine);
  const [hover, setHover] = useState<number | null>(null);

  // Сервер мог и не принять оценку: возвращаем то, что было.
  useEffect(() => {
    if (state.error) setValue(mine);
  }, [state, mine]);

  const shown = hover ?? value ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <form action={formAction} className="flex items-center gap-1">
        <input type="hidden" name="analysisId" value={analysisId} />
        {/* Значение приходит от самой кнопки: скрытое поле с тем же именем
            ушло бы в FormData первым и перебило бы выбор. */}
        {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="submit"
            name="value"
            value={star}
            disabled={!canRate || pending}
            onMouseEnter={() => canRate && setHover(star)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setValue(star)}
            aria-label={`Оценка ${star} из ${MAX_RATING}`}
            aria-pressed={value === star}
            className={cx(
              'rounded-full p-0.5 transition',
              canRate
                ? 'cursor-pointer hover:scale-110 active:scale-95'
                : 'cursor-default opacity-70',
            )}
          >
            <Star filled={star <= shown} />
          </button>
        ))}
      </form>

      <div className="text-sm text-[color:var(--muted)]">
        {count > 0 ? (
          <>
            <span className="tabular-nums text-[color:var(--ink)]">
              {average?.toFixed(1) ?? '—'}
            </span>{' '}
            · {count} {pluralRatings(count)}
          </>
        ) : (
          'Оценок пока нет'
        )}
        {value !== null && canRate && (
          <span className="ml-2 text-[color:var(--muted-2)]">ваша: {value}</span>
        )}
      </div>

      {!canRate && (
        <Link
          href="/signin"
          className="text-sm text-[color:var(--ink-2)] underline underline-offset-4 hover:no-underline"
        >
          Войдите, чтобы оценить
        </Link>
      )}

      {state.error && <span className="text-sm text-[color:var(--ink)]">{state.error}</span>}
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill={filled ? 'var(--ink)' : 'none'}
      stroke="var(--ink)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M12 3.5l2.6 5.5 6 .85-4.35 4.2 1.05 5.95L12 17.2l-5.3 2.8 1.05-5.95L3.4 9.85l6-.85z" />
    </svg>
  );
}

function pluralRatings(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'оценка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'оценки';
  return 'оценок';
}
