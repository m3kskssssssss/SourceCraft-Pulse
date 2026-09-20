'use client';

// Показывает markdown-код бейджа + кнопку копирования в буфер обмена.
// Автоопределяет origin текущей страницы, чтобы markdown был готов к вставке.

import { useEffect, useState } from 'react';

export function BadgeMarkdown({ org, repo }: { org: string; repo: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const markdown =
    origin && `[![Pulse](${origin}/api/badge/${org}/${repo}.svg)](${origin}/r/${org}/${repo})`;

  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="flex-1 overflow-x-auto rounded-2xl bg-neutral-100 px-3 py-2 text-xs">
        {markdown || 'Готовим…'}
      </code>
      <button
        type="button"
        onClick={async () => {
          if (!markdown) return;
          try {
            await navigator.clipboard.writeText(markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // ignore
          }
        }}
        className="rounded-full border border-neutral-300 px-3 py-2 text-xs hover:bg-neutral-100"
      >
        {copied ? 'Скопировано' : 'Скопировать'}
      </button>
    </div>
  );
}
