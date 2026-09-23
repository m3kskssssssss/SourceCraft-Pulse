// Модерация обсуждений: оценки и комментарии со всех анализов сразу.
//
// Отдельный раздел, потому что искать нужный комментарий по страницам
// анализов невозможно: они разбросаны, а модерации нужен общий список,
// отсортированный по свежести.

import Link from 'next/link';
import {
  adminDeleteCommentAction,
  adminDeleteRatingAction,
  requireAdmin,
} from '@/app/actions/admin';
import { ConfirmSubmit } from '@/app/components/ConfirmSubmit';
import { Chip, EmptyState, StarIcon } from '@/app/components/ui';
import { getCommentsList, getRatingsList } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

export default async function AdminSocial() {
  await requireAdmin();
  const [comments, ratings] = await Promise.all([getCommentsList(200), getRatingsList(200)]);

  return (
    <section>
      <Chip tone="outline">Админка</Chip>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Обсуждение</h1>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
        Последние оценки и комментарии со всех анализов. Удаление здесь — начисто: комментарий
        уходит вместе с ответами на него, а средняя оценка анализа пересчитывается сама.
      </p>

      <h2 className="mt-10 text-lg font-medium">
        Комментарии{' '}
        <span className="text-sm font-normal text-[color:var(--muted)]">({comments.length})</span>
      </h2>
      {comments.length === 0 ? (
        <EmptyState className="mt-4" title="Комментариев ещё нет" />
      ) : (
        <ol className="mt-4 grid gap-3">
          {comments.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[color:var(--muted)]">
                {row.authorId ? (
                  <Link href={`/u/${row.authorId}`} className="font-medium text-[color:var(--ink)] hover:underline">
                    {row.authorName}
                  </Link>
                ) : (
                  <span className="font-medium text-[color:var(--ink)]">{row.authorName}</span>
                )}
                <Link href={`/a/${row.analysisId}#comments`} className="hover:underline">
                  {row.orgRepo}
                </Link>
                <span>{formatDateTime(row.createdAt)}</span>
                {row.isReply && <Chip tone="outline">ответ</Chip>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[color:var(--ink-2)]">
                {row.body}
              </p>
              <form action={adminDeleteCommentAction} className="mt-3">
                <input type="hidden" name="commentId" value={row.id} />
                <ConfirmSubmit
                  tone="danger"
                  question={`Удалить комментарий ${row.authorName} под ${row.orgRepo}? Ответы на него тоже исчезнут.`}
                >
                  Удалить
                </ConfirmSubmit>
              </form>
            </li>
          ))}
        </ol>
      )}

      <h2 className="mt-12 text-lg font-medium">
        Оценки{' '}
        <span className="text-sm font-normal text-[color:var(--muted)]">({ratings.length})</span>
      </h2>
      {ratings.length === 0 ? (
        <EmptyState className="mt-4" title="Оценок ещё нет" />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-[color:var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-normal">Кто</th>
                <th className="px-5 py-3 font-normal">Репозиторий</th>
                <th className="px-5 py-3 font-normal">Оценка</th>
                <th className="px-5 py-3 font-normal">Когда</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {ratings.map((row) => (
                <tr key={row.id} className="border-t border-[color:var(--line)]">
                  <td className="px-5 py-3">
                    {row.authorId ? (
                      <Link href={`/u/${row.authorId}`} className="hover:underline">
                        {row.authorName}
                      </Link>
                    ) : (
                      row.authorName
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/a/${row.analysisId}`} className="hover:underline">
                      {row.orgRepo}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <StarIcon size={12} /> {row.value}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[color:var(--muted)]">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={adminDeleteRatingAction}>
                      <input type="hidden" name="ratingId" value={row.id} />
                      <ConfirmSubmit
                        tone="danger"
                        question={`Удалить оценку ${row.value} от ${row.authorName} для ${row.orgRepo}?`}
                      >
                        Удалить
                      </ConfirmSubmit>
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
