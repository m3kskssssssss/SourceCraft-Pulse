// Ссылки на выгрузку оценки: карточка и подробный отчёт — PDF или PNG.
// Файлы рисует /a/{id}/export/{file} в светлой палитре сайта.

const FILES = [
  { file: 'card.pdf', label: 'Карточка', format: 'PDF' },
  { file: 'card.png', label: 'Карточка', format: 'PNG' },
  { file: 'report.pdf', label: 'Отчёт', format: 'PDF' },
  { file: 'report.png', label: 'Отчёт', format: 'PNG' },
] as const;

export function ExportLinks({ analysisId, className }: { analysisId: string; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-2 sm:flex sm:flex-wrap ${className ?? ''}`}>
      {FILES.map((f) => (
        <a
          key={f.file}
          href={`/a/${analysisId}/export/${f.file}`}
          download
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--line-2)] bg-[color:var(--paper)] px-3.5 py-2 text-sm text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel)] active:scale-[0.97]"
        >
          <DownloadIcon />
          {f.label}
          <span className="font-mono text-[11px] text-[color:var(--muted)]">{f.format}</span>
        </a>
      ))}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
