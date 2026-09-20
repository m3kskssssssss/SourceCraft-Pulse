import { adminRerunJobAction, requireAdmin } from '@/app/actions/admin';
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
      <h1 className="text-3xl font-semibold tracking-tight">Очередь</h1>
      {rows.length === 0 ? (
        <p className="mt-4 text-neutral-500">Очередь пуста.</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr>
              <th className="py-2">Репозиторий</th>
              <th>Статус</th>
              <th className="text-right">Попыток</th>
              <th>Ошибка</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.jobId} className="border-t border-neutral-200 align-top">
                <td className="py-2">
                  <div>{row.orgRepo ?? '—'}</div>
                  <div className="text-xs text-neutral-500">
                    задача · {new Date(row.createdAt).toLocaleString('ru-RU')}
                  </div>
                </td>
                <td>{STATUS_LABELS[row.status]}</td>
                <td className="text-right tabular-nums">{row.attempts}</td>
                <td className="max-w-md text-xs text-neutral-600">
                  {row.lastError ? truncate(row.lastError, 240) : '—'}
                </td>
                <td className="text-right">
                  <form action={adminRerunJobAction}>
                    <input type="hidden" name="analysisId" value={row.analysisId} />
                    <button
                      type="submit"
                      className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
                    >
                      Перезапустить
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + '…';
}
