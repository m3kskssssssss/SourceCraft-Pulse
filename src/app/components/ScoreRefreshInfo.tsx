// Блок на главной: как обновляются оценки. Дважды в сутки сверяем коммиты —
// нет новых, оценка остаётся; есть — переоцениваем. Снизу живая строка:
// когда следующая проверка и что дала текущая.

import type { CommitCheckBrief } from '@/lib/commit-check';
import { APP_TIME_ZONE } from '@/lib/time';

const STEPS = [
  {
    time: '00:00 · 12:00',
    title: 'Сверяем коммиты',
    text: 'Дважды в сутки по Москве смотрим верхушку основной ветки каждого оценённого репозитория.',
  },
  {
    time: 'нет новых',
    title: 'Оценка остаётся',
    text: 'Балл тот же, один в один, а в истории оценок появляется отметка «без изменений».',
  },
  {
    time: 'есть новые',
    title: 'Переоцениваем',
    text: 'Репозиторий проходит оценку заново, новая сменяет прежнюю в рейтинге, бейдже и карточке.',
  },
];

export function ScoreRefreshInfo({ brief }: { brief: CommitCheckBrief }) {
  const next = new Date(brief.nextSlot).toLocaleString('ru-RU', {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  const touched = brief.unchanged + brief.changed;

  return (
    <div>
      <h2 className="text-3xl font-semibold tracking-tight">Оценки не стареют</h2>
      <p className="mt-1.5 max-w-2xl text-sm text-[color:var(--muted)]">
        Пересчитываем только то, что изменилось: без новых коммитов оценке незачем меняться.
      </p>

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="rise rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">{step.time}</div>
            <div className="mt-2 text-lg font-semibold">{step.title}</div>
            <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--muted)]">{step.text}</p>
          </li>
        ))}
      </ol>

      <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[color:var(--muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="stage-pulse h-2 w-2 rounded-full bg-[color:var(--ink)]" aria-hidden />
          Следующая проверка — {next} по Москве.
        </span>
        {touched > 0 && (
          <span>
            В этой проверке: без изменений {brief.unchanged.toLocaleString('ru-RU')}, с новыми коммитами — на переоценку{' '}
            {brief.changed.toLocaleString('ru-RU')}.
          </span>
        )}
      </p>
    </div>
  );
}
