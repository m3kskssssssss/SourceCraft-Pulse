import { requireAdmin } from '@/app/actions/admin';
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
      <h1 className="text-3xl font-semibold tracking-tight">Сводка</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card label="Анализов за сутки" value={fmt(stats.analyses.day)} />
        <Card label="За неделю" value={fmt(stats.analyses.week)} />
        <Card label="За месяц" value={fmt(stats.analyses.month)} />
        <Card label="Успешных" value={fmt(stats.analyses.done)} />
        <Card label="Упавших" value={fmt(stats.analyses.failed)} />
        <Card label="Медиана времени" value={fmtDuration(stats.medianRuntimeMs)} />
        <Card label="Пользователей" value={fmt(stats.users.total)} />
        <Card label="Активны за неделю" value={fmt(stats.users.activeWeek)} />
        <Card label="Опубликовано в рейтинге" value={fmt(stats.ranking.published)} />
      </div>
    </section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-neutral-100 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
