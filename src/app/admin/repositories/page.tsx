import Link from 'next/link';
import { adminUnpublishAction, requireAdmin } from '@/app/actions/admin';
import { Chip, EmptyState, cx } from '@/app/components/ui';
import { getAllAnalyses } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

const STATUS_LABELS = {
  queued: 'в очереди',
  running: 'выполняется',
  done: 'готово',
  failed: 'упал',
} as const;

type Search = { status?: 'queued' | 'running' | 'done' | 'failed' };

export default async function AdminRepositories({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = ['queued', 'running', 'done', 'failed'].includes(sp.status ?? '')
    ? (sp.status as Search['status'])
    : undefined;
  const rows = await getAllAnalyses(filter, 300);

  return (
    <section>
      <Chip tone="outline">Админка</Chip>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Репозитории</h1>
        <div className="flex flex-wrap items-center gap-1 rounded-full bg-[color:var(--panel)] p-1 text-sm">
          <FilterLink label="Все" href="/admin/repositories" active={!filter} />
          {(['queued', 'running', 'done', 'failed'] as const).map((s) => (
            <FilterLink
              key={s}
              label={STATUS_LABELS[s]}
              href={`/admin/repositories?status=${s}`}
              active={filter === s}
            />
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState className="mt-8" title="Анализов нет" />
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
          <table className="w-full text-sm">
            <thead className="text-left text-[color:var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-normal">Репозиторий</th>
                <th className="px-5 py-3 font-normal">Статус</th>
                <th className="px-5 py-3 text-right font-normal">Оценка</th>
                <th className="px-5 py-3 font-normal">Публично</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[color:var(--line)]">
                  <td className="px-5 py-3">
                    <Link href={`/a/${row.id}`} className="font-medium hover:underline">
                      {row.orgRepo}
                    </Link>
                    <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                      {new Date(row.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Chip tone="default">{STATUS_LABELS[row.status]}</Chip>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.score ?? '—'}</td>
                  <td className="px-5 py-3">{row.isPublic ? 'да' : 'нет'}</td>
                  <td className="px-5 py-3 text-right">
                    {row.isPublic && (
                      <form action={adminUnpublishAction}>
                        <input type="hidden" name="analysisId" value={row.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs hover:bg-[color:var(--panel)]"
                        >
                          Снять с публикации
                        </button>
                      </form>
                    )}
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

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cx(
        'rounded-full px-3 py-1.5 transition',
        active
          ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
          : 'text-[color:var(--muted)] hover:text-[color:var(--ink)]',
      )}
    >
      {label}
    </Link>
  );
}
