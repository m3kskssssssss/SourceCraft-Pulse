import { adminToggleBlockAction, requireAdmin } from '@/app/actions/admin';
import { getUsersList } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

export default async function AdminUsers() {
  await requireAdmin();
  const rows = await getUsersList(200);

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Пользователи</h1>
      {rows.length === 0 ? (
        <p className="mt-4 text-neutral-500">Пользователей ещё нет.</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr>
              <th className="py-2">Email</th>
              <th>Зарегистрирован</th>
              <th className="text-right">Анализов</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-neutral-200">
                <td className="py-2">{row.email}</td>
                <td>{new Date(row.createdAt).toLocaleDateString('ru-RU')}</td>
                <td className="text-right tabular-nums">{row.analysesN}</td>
                <td>{row.blockedAt ? 'заблокирован' : 'активен'}</td>
                <td className="text-right">
                  <form action={adminToggleBlockAction}>
                    <input type="hidden" name="userId" value={row.id} />
                    <input type="hidden" name="next" value={row.blockedAt ? '0' : '1'} />
                    <button
                      type="submit"
                      className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
                    >
                      {row.blockedAt ? 'Разблокировать' : 'Заблокировать'}
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
