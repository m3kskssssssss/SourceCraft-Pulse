import Link from 'next/link';
import { adminUnpublishAction, requireAdmin } from '@/app/actions/admin';
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
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Репозитории</h1>
        <div className="flex gap-2 text-sm">
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
        <p className="mt-6 text-neutral-500">Анализов нет.</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr>
              <th className="py-2">Репозиторий</th>
              <th>Статус</th>
              <th className="text-right">Оценка</th>
              <th>Публично</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-neutral-200">
                <td className="py-2">
                  <Link href={`/a/${row.id}`} className="hover:underline">
                    {row.orgRepo}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    {new Date(row.createdAt).toLocaleString('ru-RU')}
                  </div>
                </td>
                <td>{STATUS_LABELS[row.status]}</td>
                <td className="text-right tabular-nums">{row.score ?? '—'}</td>
                <td>{row.isPublic ? 'да' : 'нет'}</td>
                <td className="text-right">
                  {row.isPublic && (
                    <form action={adminUnpublishAction}>
                      <input type="hidden" name="analysisId" value={row.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
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
      )}
    </section>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link href={href} className={active ? 'font-semibold' : 'text-neutral-600 hover:underline'}>
      {label}
    </Link>
  );
}
