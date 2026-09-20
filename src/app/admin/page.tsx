import { requireAdmin } from '@/app/actions/admin';
import { Chip, Stat } from '@/app/components/ui';
import { getOverviewStats } from '@/lib/admin-stats';

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
  const stats = await getOverviewStats();

  return (
    <section>
      <Chip tone="outline">админ</Chip>
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
    </section>
  );
}
