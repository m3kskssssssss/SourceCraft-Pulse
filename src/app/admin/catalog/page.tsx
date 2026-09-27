import Link from 'next/link';
import {
  adminCatalogStartAction,
  adminCatalogStopAction,
  requireAdmin,
} from '@/app/actions/admin';
import { AutoRefresh } from '@/app/components/AutoRefresh';
import { Bar, Chip, EmptyState, Stat } from '@/app/components/ui';
import { db } from '@/db/client';
import { getCatalogProgress, type CatalogRunRow } from '@/lib/catalog';
import { stageLabel } from '@/lib/stages';

export const dynamic = 'force-dynamic';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

export default async function AdminCatalog() {
  await requireAdmin();
  const p = await getCatalogProgress(db);
  const processed = p.done + p.failed;
  const base = processed + p.inProgress + p.remaining;
  const percent = base > 0 ? Math.round((processed / base) * 100) : 0;
  // Флаг сняли, а начатые оценки ещё идут.
  const stopping = !p.running && p.active.length > 0;

  return (
    <section>
      <AutoRefresh ms={5000} />
      <Chip tone="outline">Админка</Chip>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Каталог</h1>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--muted)]">
            Оценка всех публичных репозиториев SourceCraft по очереди, по три одновременно.
            Считает воркер; оценённые и упавшие повторно не берутся.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Chip tone={p.running ? 'ink' : 'default'}>
            {p.running ? 'идёт' : stopping ? 'останавливается' : 'остановлен'}
          </Chip>
          {p.running ? (
            <form action={adminCatalogStopAction}>
              <button
                type="submit"
                className="rounded-full border border-[color:var(--line-2)] px-5 py-2 text-sm font-medium transition active:scale-[0.97] hover:bg-[color:var(--panel)]"
              >
                Стоп
              </button>
            </form>
          ) : (
            <form action={adminCatalogStartAction}>
              <button
                type="submit"
                disabled={p.remaining === 0}
                className="rounded-full bg-[color:var(--ink)] px-5 py-2 text-sm font-medium text-[color:var(--paper)] transition active:scale-[0.97] hover:bg-[color:var(--ink-2)] disabled:opacity-40"
              >
                Старт
              </button>
            </form>
          )}
        </div>
      </div>

      {p.total === 0 ? (
        <EmptyState
          className="mt-8"
          title="Каталог ещё не загружен"
          hint="Воркер обходит GET /repos раз в сутки; вручную — pnpm catalog:sync."
        />
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Обработано" value={fmt(processed)} hint={`оценено ${fmt(p.done)}, упало ${fmt(p.failed)}`} />
            <Stat label="В работе" value={fmt(p.inProgress)} />
            <Stat label="Не обработано" value={fmt(p.remaining)} hint="ждут своей очереди" />
            <Stat
              label="Всего в каталоге"
              value={fmt(p.total)}
              hint={`в рейтинг годятся ${fmt(p.eligible)}: без форков, зеркал, шаблонов и пустых`}
            />
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-xs text-[color:var(--muted)]">
              <span>Прогресс</span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <Bar value={percent} className="mt-2" height={8} />
            {p.syncedAt && (
              <div className="mt-2 text-xs text-[color:var(--muted)]">
                Каталог обновлён {new Date(p.syncedAt).toLocaleString('ru-RU')}
              </div>
            )}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <RunList title="В работе" rows={p.active} empty="Сейчас ничего не считается." />
            <RunList title="Последние обработанные" rows={p.recent} empty="Пока ничего." />
          </div>

          <h2 className="mt-10 text-lg font-semibold">Следующие в очереди</h2>
          {p.next.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--muted)]">Неоценённых не осталось.</p>
          ) : (
            <ol className="mt-3 divide-y divide-[color:var(--line)] rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] text-sm">
              {p.next.map((r) => (
                <li key={`${r.org}/${r.repo}`} className="flex justify-between gap-4 px-5 py-2.5">
                  <span className="min-w-0 break-all">
                    {r.org}/{r.repo}
                  </span>
                  <span className="shrink-0 tabular-nums text-[color:var(--muted)]">
                    {r.likes ?? 0} ★
                  </span>
                </li>
              ))}
            </ol>
          )}

          <p className="mt-6 text-xs text-[color:var(--muted)]">
            «Стоп» не обрывает начатые оценки: они доходят до конца, новые не берутся. Задачи
            пользователей идут вперёд каталога. Страница обновляется сама каждые 5 секунд.
          </p>
        </>
      )}
    </section>
  );
}

const STATUS_LABELS: Record<CatalogRunRow['status'], string> = {
  queued: 'в очереди',
  running: 'считается',
  done: 'готово',
  failed: 'упал',
};

function RunList({ title, rows, empty }: { title: string; rows: CatalogRunRow[]; empty: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--muted)]">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[color:var(--line)] rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] text-sm">
          {rows.map((r) => (
            <li key={r.analysisId} className="flex items-start justify-between gap-4 px-5 py-2.5">
              <div className="min-w-0">
                <Link href={`/a/${r.analysisId}`} className="break-all hover:underline">
                  {r.orgRepo}
                </Link>
                <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                  {r.status === 'running'
                    ? (stageLabel(r.stage) ?? 'начинается')
                    : r.status === 'failed' && r.error
                      ? r.error.slice(0, 120)
                      : new Date(r.at).toLocaleString('ru-RU')}
                </div>
              </div>
              <span className="shrink-0 tabular-nums">
                {r.status === 'done' && r.score !== null ? r.score : STATUS_LABELS[r.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
