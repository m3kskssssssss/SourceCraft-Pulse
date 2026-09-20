import { adminRerunJobAction, requireAdmin } from '@/app/actions/admin';
import { Chip, EmptyState } from '@/app/components/ui';
import { getQueueRows } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

const STATUS_LABELS = {
  queued: 'в очереди',
  running: 'выполняется',
  done: 'готово',
  failed: 'упал',
} as const;

export default async function AdminQueue() {
  await requireAdmin();
  const rows = await getQueueRows(200);

  return (
    <section>
      <Chip tone="outline">админ</Chip>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Очередь</h1>

      {rows.length === 0 ? (
        <EmptyState className="mt-8" title="Очередь пуста" hint="Работы для воркера нет." />
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
          <table className="w-full text-sm">
            <thead className="text-left text-[color:var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-normal">Репозиторий</th>
                <th className="px-5 py-3 font-normal">Статус</th>
                <th className="px-5 py-3 text-right font-normal">Попыток</th>
                <th className="px-5 py-3 font-normal">Ошибка</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.jobId}
                  className="border-t border-[color:var(--line)] align-top"
                >
                  <td className="px-5 py-3">
                    <div className="font-medium">{row.orgRepo ?? '—'}</div>
                    <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                      {new Date(row.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Chip tone="default">{STATUS_LABELS[row.status]}</Chip>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.attempts}</td>
                  <td className="max-w-md px-5 py-3 text-xs text-[color:var(--muted)]">
                    {row.lastError ? truncate(row.lastError, 240) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={adminRerunJobAction}>
                      <input type="hidden" name="analysisId" value={row.analysisId} />
                      <button
                        type="submit"
                        className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs hover:bg-[color:var(--panel)]"
                      >
                        Перезапустить
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + '…';
}
