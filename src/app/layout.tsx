import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { UserBar } from './components/UserBar';
import { Planet } from './components/Planet';
import { THEME_SCRIPT } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulse — оценка здоровья репозиториев SourceCraft',
  description:
    'Введите org/repo с SourceCraft, чтобы получить оценку 0–100, объяснение и конкретные рекомендации.',
  applicationName: 'Pulse',
  authors: [{ name: 'Pulse' }],
  openGraph: {
    title: 'Pulse — здоровье репозиториев SourceCraft',
    description: 'Оценка 0–100 по активности, коду, безопасности и документации.',
    type: 'website',
  },
};

/** Цвет панели браузера на телефоне — под системную тему. */
export const viewport: Viewport = {
  // cover — чтобы iPhone отдал env(safe-area-inset-*): по ним стоят шапка и
  // нижняя панель, иначе полоска «домой» наезжала бы на вкладки.
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c0d' },
  ],
};

export default function RootLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    // suppressHydrationWarning: data-theme на <html> ставит скрипт ниже до
    // гидрации, и React не должен считать это расхождением.
    <html lang="ru" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Явно выбранная тема — до первой отрисовки, без мигания. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full bg-[color:var(--paper)] text-[color:var(--ink)] font-sans">
        {/* overflow-x: clip, а не hidden: clip не создаёт контейнер прокрутки,
            поэтому sticky-шапка продолжает липнуть к окну. Любой декор,
            вылезший за край (планета на фоне), больше не даёт боковой
            прокрутки на телефоне. */}
        <div className="flex min-h-screen flex-col [overflow-x:clip]">
          <UserBar />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          {/* Место под нижнюю панель на телефоне — чтобы она не закрывала подвал. */}
          <div className="tabbar-spacer md:hidden" aria-hidden />
        </div>
        {/* Веб-аналитика Vercel: без этого скрипта панель в дашборде остаётся
            пустой, сколько бы её ни включали в настройках проекта. */}
        {/* Окно входа и регистрации поверх страницы (app/@modal). */}
        {modal}
        <Analytics />
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[color:var(--line)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-[color:var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Planet size={22} />
          <span>Pulse · оценка здоровья репозиториев SourceCraft</span>
        </div>
        {/* Шапку здесь не повторяем: в подвале только то, чего нет выше. */}
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            className="transition hover:text-[color:var(--ink)]"
            href="/api/public/leaderboard"
            prefetch={false}
          >
            Публичный API
          </Link>
          <a
            className="transition hover:text-[color:var(--ink)]"
            href="https://sourcecraft.dev"
            target="_blank"
            rel="noreferrer noopener"
          >
            SourceCraft ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}
