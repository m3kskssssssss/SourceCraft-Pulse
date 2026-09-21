import {
  adminDeleteJobAction,
  adminRerunJobAction,
  adminRunJobNowAction,
  adminRunQueueAction,
  requireAdmin,
} from '@/app/actions/admin';
import { Chip, EmptyState } from '@/app/components/ui';
import { getQueueRows } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';
/** Прогон считается прямо в этом запросе — нужен весь лимит Fluid compute. */
export const maxDuration = 300;

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
      <Chip tone="outline">Админка</Chip>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Очередь</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Задачи считаются прямо в этом запросе: отдельного воркера в проде нет.
          </p>
        </div>
        {rows.length > 0 && (
          <form action={adminRunQueueAction}>
            <button
              type="submit"
              className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-[color:var(--paper)] transition active:scale-[0.97] hover:bg-[color:var(--ink-2)]"
            >
              Выполнить всю очередь
            </button>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState className="mt-8" title="Очередь пуста" hint="Задач нет." />
      ) : (
        <>
          <div className="mt-8 overflow-x-auto rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
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
                  <tr key={row.jobId} className="border-t border-[color:var(--line)] align-top">
                    <td className="px-5 py-3">
                      <div className="font-medium">{row.orgRepo ?? '—'}</div>
                      <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                        {new Date(row.createdAt).toLocaleString('ru-RU')}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Chip tone="default">{STATUS_LABELS[row.status]}</Chip>
                      {row.lockedBy && (
                        <div className="mt-1 text-[11px] text-[color:var(--muted-2)]">
                          лок: {row.lockedBy}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.attempts}</td>
                    <td className="max-w-md px-5 py-3 text-xs text-[color:var(--muted)]">
                      {row.lastError ? truncate(row.lastError, 240) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <form action={adminRunJobNowAction}>
                          <input type="hidden" name="analysisId" value={row.analysisId} />
                          <RowButton tone="ink">Выполнить</RowButton>
                        </form>
                        <form action={adminRerunJobAction}>
                          <input type="hidden" name="analysisId" value={row.analysisId} />
                          <RowButton>Сбросить лок</RowButton>
                        </form>
                        <form action={adminDeleteJobAction}>
                          <input type="hidden" name="jobId" value={row.jobId} />
                          <RowButton>Снять</RowButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-[color:var(--muted)]">
            «Выполнить» считает анализ целиком и ждёт результата — до нескольких минут на
            репозиторий. «Сбросить лок» обнуляет попытки и снимает захват, не запуская расчёт.
            «Снять» убирает задачу из очереди, а сам анализ помечает упавшим.
          </p>
        </>
      )}
    </section>
  );
}

function RowButton({ children, tone }: { children: React.ReactNode; tone?: 'ink' }) {
  const base =
    'rounded-full px-3 py-1.5 text-xs transition active:scale-[0.97] whitespace-nowrap';
  const look =
    tone === 'ink'
      ? 'bg-[color:var(--ink)] text-[color:var(--paper)] hover:bg-[color:var(--ink-2)]'
      : 'border border-[color:var(--line)] hover:bg-[color:var(--panel)]';
  return (
    <button type="submit" className={`${base} ${look}`}>
      {children}
    </button>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + '…';
}
