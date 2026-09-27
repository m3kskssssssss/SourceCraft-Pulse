import Link from 'next/link';
import {
  adminBulkRepositoryCounts,
  adminDeleteAnalysisAction,
  adminDeleteRepositoriesBulkAction,
  adminDeleteRepositoryAction,
  adminUnpublishAction,
  requireAdmin,
} from '@/app/actions/admin';
import { Chip, EmptyState, cx } from '@/app/components/ui';
import { ConfirmSubmit } from '@/app/components/ConfirmSubmit';
import { ConfirmBySum } from '@/app/components/ConfirmBySum';
import { getAllAnalyses } from '@/lib/admin-stats';
import { APP_TIME_ZONE } from '@/lib/time';

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
  const [rows, counts] = await Promise.all([getAllAnalyses(filter, 300), adminBulkRepositoryCounts()]);

  return (
    <section>
      <Chip tone="outline">Админка</Chip>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Репозитории</h1>
        <div className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[color:var(--panel)] p-1 text-sm">
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

      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Строка — один прогон. «Удалить репозиторий» уносит и все остальные его прогоны.
      </p>

      <div className="mt-6 rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-4 sm:p-5">
        <div className="text-sm font-medium">Массовая уборка</div>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
          Уходят репозитории со всеми оценками, очередью, заявками «мой репозиторий» и подготовленными PR.
          Каталог SourceCraft остаётся — прогон каталога возьмёт их заново.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ConfirmBySum
            action={adminDeleteRepositoriesBulkAction}
            fields={{ scope: 'no_ai' }}
            disabled={counts.no_ai === 0}
            label={<>Удалить оценённые без ИИ · {counts.no_ai}</>}
            title="Удалить репозитории, оценённые без ИИ?"
            description={
              <>
                {counts.no_ai} репозиториев, у которых ни один готовый прогон не получил ответа модели. Приватные не
                трогаем — ИИ им не положен. Отменить будет нельзя.
              </>
            }
          />
          <ConfirmBySum
            action={adminDeleteRepositoriesBulkAction}
            fields={{ scope: 'unranked' }}
            disabled={counts.unranked === 0}
            label={<>Удалить с оценкой, но без места · {counts.unranked}</>}
            title="Удалить репозитории без места в рейтинге?"
            description={
              <>
                {counts.unranked} репозиториев с готовой оценкой, но без места в рейтинге: форки, зеркала, шаблоны и
                копии шаблонов. Отменить будет нельзя.
              </>
            }
          />
          <ConfirmBySum
            action={adminDeleteRepositoriesBulkAction}
            fields={{ scope: 'all' }}
            disabled={counts.all === 0}
            label={<>Удалить все репозитории · {counts.all}</>}
            title="Удалить все репозитории?"
            description={
              <>
                Все {counts.all} репозиториев, включая приватные и подтверждённые владельцами, вместе со всеми
                оценками. Рейтинг станет пустым. Отменить будет нельзя.
              </>
            }
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState className="mt-8" title="Анализов нет" />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
          <table className="admin-table w-full text-sm">
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
                    <Link href={`/a/${row.id}`} className="break-all font-medium hover:underline">
                      {row.orgRepo}
                    </Link>
                    <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                      {new Date(row.createdAt).toLocaleString('ru-RU', { timeZone: APP_TIME_ZONE })}
                    </div>
                  </td>
                  <td className="px-5 py-3" data-label="Статус">
                    <Chip tone="default">{STATUS_LABELS[row.status]}</Chip>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums" data-label="Оценка">{row.score ?? '—'}</td>
                  <td className="px-5 py-3" data-label="Публично">{row.isPublic ? 'да' : 'нет'}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {row.isPublic && (
                        <form action={adminUnpublishAction}>
                          <input type="hidden" name="analysisId" value={row.id} />
                          <button
                            type="submit"
                            className="whitespace-nowrap rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs transition active:scale-[0.97] hover:bg-[color:var(--panel)]"
                          >
                            Снять с публикации
                          </button>
                        </form>
                      )}
                      <form action={adminDeleteAnalysisAction}>
                        <input type="hidden" name="analysisId" value={row.id} />
                        <ConfirmSubmit
                          question={`Удалить этот прогон ${row.orgRepo}? Отменить будет нельзя.`}
                        >
                          Удалить прогон
                        </ConfirmSubmit>
                      </form>
                      <form action={adminDeleteRepositoryAction}>
                        <input type="hidden" name="repositoryId" value={row.repositoryId} />
                        <ConfirmSubmit
                          tone="danger"
                          question={`Удалить ${row.orgRepo} вместе со всеми его оценками и историей? Отменить будет нельзя.`}
                        >
                          Удалить репозиторий
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

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cx(
        'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 transition',
        active
          ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
          : 'text-[color:var(--muted)] hover:text-[color:var(--ink)]',
      )}
    >
      {label}
    </Link>
  );
}
