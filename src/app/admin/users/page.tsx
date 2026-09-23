import Link from 'next/link';
import {
  adminDeleteUserAction,
  adminToggleBlockAction,
  requireAdmin,
} from '@/app/actions/admin';
import { ConfirmSubmit } from '@/app/components/ConfirmSubmit';
import { Chip, EmptyState } from '@/app/components/ui';
import { getUsersList } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

export default async function AdminUsers() {
  await requireAdmin();
  const rows = await getUsersList(200);

  return (
    <section>
      <Chip tone="outline">Админка</Chip>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Пользователи</h1>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
        Блокировка закрывает вход и запуск анализов, учётная запись остаётся. Удаление уносит
        оценки, комментарии и сессии; опубликованные анализы остаются в рейтинге без автора.
      </p>

      {rows.length === 0 ? (
        <EmptyState className="mt-8" title="Пользователей ещё нет" />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-left text-[color:var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-normal">Пользователь</th>
                <th className="px-5 py-3 font-normal">Зарегистрирован</th>
                <th className="px-5 py-3 text-right font-normal">Анализов</th>
                <th className="px-5 py-3 text-right font-normal">Оценок</th>
                <th className="px-5 py-3 text-right font-normal">Комментариев</th>
                <th className="px-5 py-3 font-normal">Статус</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[color:var(--line)]">
                  <td className="px-5 py-3">
                    <Link href={`/u/${row.id}`} className="font-medium hover:underline">
                      {row.displayName}
                    </Link>
                    <div className="text-xs text-[color:var(--muted)]">{row.email}</div>
                  </td>
                  <td className="px-5 py-3 text-[color:var(--muted)]">
                    {new Date(row.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.analysesN}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.ratingsN}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.commentsN}</td>
                  <td className="px-5 py-3">
                    <Chip tone={row.blockedAt ? 'ink' : 'default'}>
                      {row.blockedAt ? 'заблокирован' : 'активен'}
                    </Chip>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <form action={adminToggleBlockAction}>
                        <input type="hidden" name="userId" value={row.id} />
                        <input type="hidden" name="next" value={row.blockedAt ? '0' : '1'} />
                        <button
                          type="submit"
                          className="whitespace-nowrap rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs transition hover:bg-[color:var(--panel)]"
                        >
                          {row.blockedAt ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                      </form>
                      <form action={adminDeleteUserAction}>
                        <input type="hidden" name="userId" value={row.id} />
                        <ConfirmSubmit
                          tone="danger"
                          question={`Удалить ${row.displayName} (${row.email})? Вместе с ним исчезнут ${row.ratingsN} оценок и ${row.commentsN} комментариев. Отменить нельзя.`}
                        >
                          Удалить
                        </ConfirmSubmit>
                      </form>
                    </div>
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
