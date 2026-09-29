// «Дополнительная аналитика» на странице анализа: CODEOWNERS, пустые коммиты
// и ревью pull request. В балл не входит — подписано прямо в блоке. Нет
// данных — так и пишем, с причиной, а не прячем строку.

import type { ExtraAnalytics as Extras } from '@/lib/extra-analytics';
import { REVIEW_SAMPLE_PRS, REVIEW_WAITING_DAYS } from '@/lib/reviews';

export function ExtraAnalytics({ extras }: { extras: Extras }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Panel title="CODEOWNERS" value={codeownersValue(extras)} note={codeownersNote(extras)} />
      <Panel title="Пустые коммиты за 90 дней" value={emptyValue(extras)} note={emptyNote(extras)} />
      <Panel title="Ревью pull request" value={reviewValue(extras)} note={reviewNote(extras)} />
      {extras.reviews?.available && extras.reviews.reviewedPrs > 0 && <ReviewDetails extras={extras} />}
    </div>
  );
}

function Panel({ title, value, note }: { title: string; value: string; note: string }) {
  const empty = value === 'нет данных';
  return (
    <div className="min-w-0 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-4 sm:p-5">
      <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">{title}</div>
      <div
        className={`mt-2 text-2xl font-semibold tabular-nums [overflow-wrap:anywhere] ${
          empty ? 'text-[color:var(--muted-2)]' : ''
        }`}
      >
        {value}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">{note}</p>
    </div>
  );
}

function ReviewDetails({ extras }: { extras: Extras }) {
  const r = extras.reviews;
  if (!r?.available) return null;
  const rows: Array<[string, string]> = [
    ['PR с ревью', `${r.reviewedPrs} из ${r.sampledPrs}`],
    ['Комментариев ревьюеров', String(r.reviewComments)],
    ['Медиана комментариев на PR с ревью', r.medianCommentsPerReviewedPr === null ? '—' : String(r.medianCommentsPerReviewedPr)],
    ['Медиана до первого ревью', formatHours(r.medianFirstReviewHours)],
    ['Замечаний к уже изменённому коду', r.outdatedSharePercent === null ? '—' : `${r.outdatedSharePercent}%`],
    [`Открытых PR без ревью дольше ${REVIEW_WAITING_DAYS} дней`, String(r.waitingPrs)],
    ['Комментариев SourceCraft AppSec', String(r.appsecComments)],
    ['Основные ревьюеры', r.topReviewers.length > 0 ? r.topReviewers.map((t) => `${t.slug} (${t.comments})`).join(', ') : '—'],
  ];
  return (
    <div className="rounded-2xl border border-[color:var(--line)] md:col-span-3">
      <dl className="divide-y divide-[color:var(--line)] text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5 sm:px-5">
            <dt className="text-[color:var(--muted)]">{label}</dt>
            <dd className="text-right tabular-nums [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function codeownersValue(e: Extras): string {
  if (e.codeowners.status === 'present') return 'есть';
  if (e.codeowners.status === 'absent') return 'нет';
  return 'нет данных';
}

function codeownersNote(e: Extras): string {
  switch (e.codeowners.status) {
    case 'present':
      return `Ответственные за части кода закреплены в ${e.codeowners.path}.`;
    case 'absent':
      return 'Файл CODEOWNERS не найден: ответственные за части кода не закреплены.';
    default:
      return e.codeowners.reason === 'tree_truncated'
        ? 'Дерево файлов обрезано на 5000 записях, в полученной части файла нет.'
        : 'Дерево файлов не получено.';
  }
}

function emptyValue(e: Extras): string {
  return e.emptyCommits.status === 'known' ? String(e.emptyCommits.empty) : 'нет данных';
}

function emptyNote(e: Extras): string {
  if (e.emptyCommits.status === 'known') {
    const { empty, total } = e.emptyCommits;
    return empty === 0
      ? `Из ${total} коммитов пустых нет.`
      : `Из ${total} коммитов ${empty} не меняют ни одного файла. В метрике «Коммиты за 90 дней» они не учтены.`;
  }
  return e.emptyCommits.reason === 'old_analysis'
    ? 'Анализ выполнен до появления проверки. Показатель появится после следующей оценки.'
    : 'История коммитов не получена.';
}

function reviewValue(e: Extras): string {
  const r = e.reviews;
  if (!r?.available) return 'нет данных';
  if (r.sampledPrs === 0) return 'PR нет';
  return `${Math.round((r.reviewedPrs / r.sampledPrs) * 100)}%`;
}

function reviewNote(e: Extras): string {
  const r = e.reviews;
  if (!r) return 'Комментарии к pull request получить не удалось или репозиторий приватный.';
  if (!r.available) return 'Комментарии к pull request получить не удалось.';
  if (r.sampledPrs === 0) return 'Изменения не проходят через pull request.';
  return `Доля PR с комментариями не автора среди ${r.sampledPrs} последних (не больше ${REVIEW_SAMPLE_PRS}).`;
}

function formatHours(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return 'меньше часа';
  if (hours < 48) return `${Math.round(hours)} ч`;
  return `${Math.round(hours / 24)} дн.`;
}
