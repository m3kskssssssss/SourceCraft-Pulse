import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { UserBar } from './components/UserBar';
import { Planet } from './components/Planet';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulse — оценка здоровья репозиториев SourceCraft',
  description:
    'Введите org/repo с SourceCraft, чтобы получить оценку 0–100, объяснение и конкретные рекомендации.',
  applicationName: 'Pulse',
  authors: [{ name: 'Pulse' }],
  icons: [{ rel: 'icon', url: '/icon.svg', type: 'image/svg+xml' }],
  openGraph: {
    title: 'Pulse — здоровье репозиториев SourceCraft',
    description: 'Оценка 0–100 по активности, коду, безопасности и документации.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full bg-[color:var(--paper)] text-[color:var(--ink)] font-sans">
        <div className="flex min-h-screen flex-col">
          <UserBar />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
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
