import { requireAdmin } from '@/app/actions/admin';
import { Chip, Stat } from '@/app/components/ui';
import { getOverviewStats } from '@/lib/admin-stats';
import { countPublishedReports, PDF_PART } from '@/lib/reports-export';

export const dynamic = 'force-dynamic';

function fmt(n: number | null | undefined): string {
  return typeof n === 'number' ? n.toLocaleString('ru-RU') : '—';
}

function fmtDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)} мс`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} с`;
  return `${(s / 60).toFixed(1)} мин`;
}

export default async function AdminOverview() {
  await requireAdmin();
  const [stats, reports] = await Promise.all([getOverviewStats(), countPublishedReports()]);
  const pdfParts = Math.ceil(reports / PDF_PART);

  return (
    <section>
      <Chip tone="outline">Админка</Chip>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Сводка</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Ключевые числа по системе.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Анализов за сутки" value={fmt(stats.analyses.day)} />
        <Stat label="За неделю" value={fmt(stats.analyses.week)} />
        <Stat label="За месяц" value={fmt(stats.analyses.month)} />
        <Stat label="Успешных" value={fmt(stats.analyses.done)} />
        <Stat label="Упавших" value={fmt(stats.analyses.failed)} />
        <Stat label="Медиана времени" value={fmtDuration(stats.medianRuntimeMs)} />
        <Stat label="Пользователей" value={fmt(stats.users.total)} />
        <Stat label="Активны за неделю" value={fmt(stats.users.activeWeek)} />
        <Stat label="Опубликовано в рейтинге" value={fmt(stats.ranking.published)} />
      </div>

      <div className="mt-10 rounded-3xl border border-[color:var(--line)] p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Выгрузка отчётов</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Подробный отчёт по каждому опубликованному репозиторию ({fmt(reports)}) — ZIP-архивом, внутри
          оглавление README.md. PDF собирается дольше, поэтому разбит на части по {PDF_PART}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/admin/reports-export?format=md"
            className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-[color:var(--paper)]"
          >
            Все отчёты · Markdown
          </a>
          {Array.from({ length: pdfParts }, (_, i) => (
            <a
              key={i}
              href={`/api/admin/reports-export?format=pdf&part=${i + 1}`}
              className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm"
            >
              PDF · {i * PDF_PART + 1}–{Math.min((i + 1) * PDF_PART, reports)}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
