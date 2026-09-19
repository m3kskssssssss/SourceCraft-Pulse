import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulse — оценка здоровья репозиториев SourceCraft',
  description:
    'Введите org/repo с SourceCraft, чтобы получить оценку 0–100, объяснение и конкретные рекомендации.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
