import { adminToggleBlockAction, requireAdmin } from '@/app/actions/admin';
import { Chip, EmptyState } from '@/app/components/ui';
import { getUsersList } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

export default async function AdminUsers() {
  await requireAdmin();
  const rows = await getUsersList(200);

  return (
    <section>
      <Chip tone="outline">админ</Chip>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Пользователи</h1>

      {rows.length === 0 ? (
        <EmptyState className="mt-8" title="Пользователей ещё нет" />
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
          <table className="w-full text-sm">
            <thead className="text-left text-[color:var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-normal">Email</th>
                <th className="px-5 py-3 font-normal">Зарегистрирован</th>
                <th className="px-5 py-3 text-right font-normal">Анализов</th>
                <th className="px-5 py-3 font-normal">Статус</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[color:var(--line)]">
                  <td className="px-5 py-3">{row.email}</td>
                  <td className="px-5 py-3 text-[color:var(--muted)]">
                    {new Date(row.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.analysesN}</td>
                  <td className="px-5 py-3">
                    <Chip tone={row.blockedAt ? 'ink' : 'default'}>
                      {row.blockedAt ? 'заблокирован' : 'активен'}
                    </Chip>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={adminToggleBlockAction}>
                      <input type="hidden" name="userId" value={row.id} />
                      <input type="hidden" name="next" value={row.blockedAt ? '0' : '1'} />
                      <button
                        type="submit"
                        className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs hover:bg-[color:var(--panel)]"
                      >
                        {row.blockedAt ? 'Разблокировать' : 'Заблокировать'}
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
