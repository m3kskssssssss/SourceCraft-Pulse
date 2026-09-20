import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SessionProvider } from 'next-auth/react';
import { UserBar } from './components/UserBar';
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
        <SessionProvider>
          <div className="flex min-h-screen flex-col">
            <UserBar />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[color:var(--line)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-[color:var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--ink)] text-[10px] font-semibold text-[color:var(--paper)]">
            P
          </span>
          <span>Pulse · оценка здоровья репозиториев SourceCraft</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link className="hover:text-[color:var(--ink)]" href="/">
            Главная
          </Link>
          <Link className="hover:text-[color:var(--ink)]" href="/analyze">
            Оценить
          </Link>
          <Link
            className="hover:text-[color:var(--ink)]"
            href="/api/public/leaderboard"
            prefetch={false}
          >
            Публичный API
          </Link>
          <a
            className="hover:text-[color:var(--ink)]"
            href="https://sourcecraft.tech"
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
