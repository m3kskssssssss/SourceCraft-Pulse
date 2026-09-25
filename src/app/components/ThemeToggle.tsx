'use client';

// Переключатель темы: «как в системе», светлая, тёмная.
//
// По умолчанию — как в системе: палитру выбирает css по prefers-color-scheme,
// и она сама следует за системой, если та переключается вечером. Явный выбор
// ставит на <html> data-theme и запоминается в localStorage; THEME_SCRIPT
// (lib/theme.ts) в layout.tsx применяет его до первой отрисовки, чтобы
// страница не мигала светлой.

import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { cx } from './ui';

export type ThemeChoice = 'system' | 'light' | 'dark';

const OPTIONS: Array<{ value: ThemeChoice; label: string; icon: React.ReactNode }> = [
  { value: 'system', label: 'Как в системе', icon: <SystemIcon /> },
  { value: 'light', label: 'Светлая тема', icon: <SunIcon /> },
  { value: 'dark', label: 'Тёмная тема', icon: <MoonIcon /> },
];

function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

function applyChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  // Плавный переход только на время переключения — см. globals.css.
  root.classList.add('theme-switching');
  window.setTimeout(() => root.classList.remove('theme-switching'), 400);

  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // без localStorage выбор просто не запомнится
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  // До монтирования выбор неизвестен (сервер localStorage не видит), поэтому
  // ничего не подсвечиваем — иначе на секунду загорелась бы не та кнопка.
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    setChoice(readChoice());
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Тема оформления"
      className={cx(
        'inline-flex items-center gap-0.5 rounded-full border border-[color:var(--line)] p-0.5',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => {
              setChoice(option.value);
              applyChoice(option.value);
            }}
            className={cx(
              'flex h-7 w-7 items-center justify-center rounded-full transition',
              active
                ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
                : 'text-[color:var(--muted)] hover:bg-[color:var(--panel)] hover:text-[color:var(--ink)]',
            )}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="2" y="3" width="12" height="8" rx="1.5" />
      <path d="M6 14h4M8 11v3" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle cx="8" cy="8" r="2.8" />
      <path
        d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M13.2 10.1A5.6 5.6 0 0 1 5.9 2.8a5.6 5.6 0 1 0 7.3 7.3Z" strokeLinejoin="round" />
    </svg>
  );
}
