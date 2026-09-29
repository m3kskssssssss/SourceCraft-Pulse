import Link from 'next/link';
import { requireAdmin } from '@/app/actions/admin';
import { AutoRefresh } from '@/app/components/AutoRefresh';
import { CommitCheckButton } from '@/app/components/CommitCheckButton';
import { Chip, EmptyState, Stat } from '@/app/components/ui';
import { db } from '@/db/client';
import { getCommitCheckSummary, getRecentChecks, type RecentCheckRow } from '@/lib/commit-check';
import { APP_TIME_ZONE } from '@/lib/time';

export const dynamic = 'force-dynamic';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { timeZone: APP_TIME_ZONE });
}

export default async function AdminCommits() {
  await requireAdmin();
  const [s, recent] = await Promise.all([getCommitCheckSummary(db), getRecentChecks(db, 50)]);

  return (
    <section>
      <AutoRefresh ms={10_000} />
      <Chip tone="outline">Админка</Chip>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Коммиты</h1>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--muted)]">
            Дважды в сутки, в 00:00 и 12:00 по Москве, у каждого оценённого репозитория сверяем
            верхушку ветки по умолчанию с коммитом последней оценки. Нет новых коммитов — оценка
            остаётся, в истории отметка «без изменений». Есть — репозиторий переоценивается.
          </p>
        </div>
        <CommitCheckButton disabled={s.evaluated === 0} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Оценённых репозиториев" value={fmt(s.evaluated)} />
        <Stat
          label="Без изменений"
          value={fmt(s.window.unchanged)}
          hint={`с ${when(s.slotStart)}`}
        />
        <Stat
          label="С новыми коммитами"
          value={fmt(s.window.changed)}
          hint={`переоценок в работе: ${fmt(s.pendingReanalyses)}`}
        />
        <Stat
          label="Ждут сверки"
          value={fmt(s.due)}
          hint={s.window.errors > 0 ? `ошибок в этом окне: ${fmt(s.window.errors)}` : `следующее окно ${when(s.nextSlot)}`}
        />
      </div>

      {s.lastRun && (
        <p className="mt-4 text-xs text-[color:var(--muted)]">
          Последний запуск {when(s.lastRun.at)} ({s.lastRun.trigger === 'admin' ? 'из админки' : 'по расписанию'}):
          проверено {fmt(s.lastRun.checked)}, без изменений {fmt(s.lastRun.unchanged)}, на переоценку{' '}
          {fmt(s.lastRun.changed)}, ошибок {fmt(s.lastRun.errors)}
          {s.lastRun.remaining > 0 ? `, не успели ${fmt(s.lastRun.remaining)}` : ''}.
        </p>
      )}

      <h2 className="mt-10 text-lg font-semibold">Последние проверки</h2>
      {recent.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="Проверок ещё не было"
          hint="Нажмите «Проверить сейчас» или дождитесь 00:00 / 12:00 по Москве."
        />
      ) : (
        <ul className="mt-3 divide-y divide-[color:var(--line)] rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] text-sm">
          {recent.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-4 px-5 py-2.5">
              <div className="min-w-0">
                <Link href={`/a/${r.reanalysisId ?? r.analysisId}`} className="break-all hover:underline">
                  {r.orgRepo}
                </Link>
                <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                  {when(r.at)} · {r.trigger === 'admin' ? 'вручную' : 'по расписанию'}
                  {r.headSha ? ` · ${r.headSha.slice(0, 8)}` : ''}
                  {r.outcome === 'error' && r.error ? ` · ${r.error.slice(0, 120)}` : ''}
                </div>
              </div>
              <span className="shrink-0 text-right text-xs">{outcomeLabel(r)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-[color:var(--muted)]">
        По расписанию проверку запускает внешний планировщик: POST /api/cron/commit-check с
        заголовком Authorization: Bearer $CRON_SECRET в 00:00 и 12:00 по Москве (можно и раз в
        час — повторный вызов только добирает несверенное и досчитывает переоценки). В
        docker-развёртывании это делает воркер. Страница обновляется каждые 10 секунд.
      </p>
    </section>
  );
}

function outcomeLabel(r: RecentCheckRow): string {
  if (r.outcome === 'unchanged') return 'без изменений';
  if (r.outcome === 'error') return 'ошибка';
  switch (r.reanalysisStatus) {
    case 'done':
      return 'переоценён';
    case 'failed':
      return 'переоценка упала';
    case 'running':
      return 'переоценивается';
    default:
      return 'новые коммиты · в очереди';
  }
}
