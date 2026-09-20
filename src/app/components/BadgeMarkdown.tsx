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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <code className="flex-1 overflow-x-auto rounded-2xl bg-[color:var(--panel)] px-4 py-3 font-mono text-xs text-[color:var(--ink-2)]">
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
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-xs font-medium hover:bg-[color:var(--panel)] sm:min-w-[128px]"
      >
        {copied ? '✓ Скопировано' : 'Скопировать'}
      </button>
    </div>
  );
}
