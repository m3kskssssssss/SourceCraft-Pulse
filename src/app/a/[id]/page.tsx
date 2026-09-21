// Страница отдельного анализа: сводка, категории, метрики, рекомендации, missing.
// Доступ:
//   - публичный (is_public=true) — открыт всем
//   - иначе только владельцу (requested_by === session.user.id)
// Гость на приватном анализе получает 404 (не палим существование).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses, repositories } from '@/db/schema';
import { auth } from '@/auth';
import { toggleVisibilityAction } from '@/app/actions/visibility';
import { AnalysisRunner } from '@/app/components/AnalysisRunner';
import { BadgeMarkdown } from '@/app/components/BadgeMarkdown';
import { Bar, CardDiv, Chip, EmptyState, ScoreDial } from '@/app/components/ui';
import type {
  CategoryKey,
  CategoryScore,
  MetricScore,
  Recommendation,
} from '@/lib/scoring/types';
import type { Effort } from '@/lib/scoring/config';

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

const CATEGORY_META: Record<CategoryKey, { title: string; blurb: string; order: number }> = {
  activity: {
    title: 'Активность',
    blurb: 'Как часто пишут код, сколько людей вовлечено, свежий ли проект.',
    order: 1,
  },
  code: {
    title: 'Код',
    blurb: 'Ревью, тесты, линтер — практики, из-за которых код не гниёт.',
    order: 2,
  },
  security: {
    title: 'Безопасность',
    blurb: 'Уязвимости в зависимостях, lock-файлы, SECURITY.md.',
    order: 3,
  },
  docs: {
    title: 'Документация',
    blurb: 'README, LICENSE, примеры — насколько легко в проект въехать.',
    order: 4,
  },
};

const METRIC_LABELS: Record<string, string> = {
  'activity.commits_90d': 'Коммитов за 90 дней',
  'activity.active_authors': 'Активных авторов',
  'activity.freshness': 'Свежесть последнего коммита',
  'activity.bus_factor': 'Bus factor',
  'code.pr_review_share': 'Доля PR с ревью',
  'code.first_review_median_hours': 'Медиана времени до ревью',
  'code.has_tests': 'Автотесты',
  'code.has_linter': 'Линтер',
  'security.critical_vulns': 'Critical-уязвимости',
  'security.high_vulns': 'High-уязвимости',
  'security.lockfiles_present': 'Lock-файлы',
  'security.security_md': 'SECURITY.md',
  'security.fresh_dependencies': 'Свежесть зависимостей',
  'docs.readme': 'README',
  'docs.license': 'LICENSE',
  'docs.contributing': 'CONTRIBUTING',
  'docs.changelog': 'CHANGELOG',
  'docs.usage_examples': 'Примеры использования',
};

const EFFORT_LABELS: Record<Effort, string> = {
  trivial: 'пустяк',
  small: 'мелочь',
  medium: 'средне',
  large: 'большая работа',
};

export default async function AnalysisPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.id, id),
  });
  if (!analysis) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isOwner = analysis.requestedBy === userId;
  if (!analysis.isPublic && !isOwner) notFound();

  const repo = await db.query.repositories.findFirst({
    where: eq(repositories.id, analysis.repositoryId),
  });
  const title = repo ? `${repo.orgSlug}/${repo.repoSlug}` : 'Анализ';

  const status = analysis.status;

  // ---------- незавершённые состояния ----------

  if (status === 'queued' || status === 'running') {
    return (
      <PageShell title={title} org={repo?.orgSlug} repo={repo?.repoSlug}>
        <CardDiv className="rise">
          <div className="flex items-start gap-4">
            <Pulse />
            {/* Расчёт запускает и опрашивает клиент: на Vercel анализ считается
                прямо в запросе к /api/analyses/<id>/run. */}
            <AnalysisRunner id={id} initialStatus={status} />
          </div>
        </CardDiv>
      </PageShell>
    );
  }

  if (status === 'failed') {
    return (
      <PageShell title={title} org={repo?.orgSlug} repo={repo?.repoSlug}>
        <CardDiv tone="outline" className="rise">
          <div className="flex items-start gap-4">
            <span className="mt-1 inline-flex h-3 w-3 rounded-full bg-[color:var(--ink)]" />
            <div>
              <h2 className="text-lg font-medium">Анализ упал</h2>
              <p className="mt-2 text-sm text-[color:var(--ink-2)]">
                {analysis.error ?? 'Неизвестная ошибка.'}
              </p>
              {isOwner && (
                <div className="mt-4">
                  <Link
                    href="/analyze"
                    className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)]"
                  >
                    Попробовать заново
                  </Link>
                </div>
              )}
            </div>
          </div>
        </CardDiv>
      </PageShell>
    );
  }

  // ---------- done ----------

  const categoryScores = (analysis.categoryScores ?? []) as CategoryScore[];
  const recommendations = (analysis.recommendations ?? []) as Recommendation[];
  const missing = (analysis.missing ?? []) as string[];

  const sortedCategories = [...categoryScores].sort(
    (a, b) => (CATEGORY_META[a.key]?.order ?? 9) - (CATEGORY_META[b.key]?.order ?? 9),
  );

  return (
    <PageShell title={title} org={repo?.orgSlug} repo={repo?.repoSlug}>
      {/* Sunny score card */}
      <section className="rise overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
        <div className="flex flex-wrap items-center gap-8 p-8 sm:p-10">
          <ScoreDial value={analysis.score} size={168} stroke={14} label="pulse" />
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
              Итоговая оценка
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-5xl font-semibold tabular-nums leading-none">
                {analysis.score ?? '—'}
              </span>
              <span className="text-lg text-[color:var(--muted)]">/ 100</span>
            </div>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[color:var(--ink-2)]">
              {verdict(analysis.score)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {repo?.language && <Chip tone="default">{repo.language}</Chip>}
              {analysis.finishedAt && (
                <Chip tone="default">готово {formatDate(analysis.finishedAt.toISOString())}</Chip>
              )}
              <Chip tone={analysis.isPublic ? 'ink' : 'outline'}>
                {analysis.isPublic ? 'публично' : 'приватно'}
              </Chip>
            </div>
          </div>
        </div>

        {/* мини-разбивка по категориям */}
        {sortedCategories.length > 0 && (
          <div className="grid gap-px border-t border-[color:var(--line)] bg-[color:var(--line)] sm:grid-cols-4">
            {sortedCategories.map((c) => (
              <div key={c.key} className="bg-[color:var(--paper-2)] px-5 py-4">
                <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                  {CATEGORY_META[c.key]?.title ?? c.key}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">
                    {c.value != null ? Math.round(c.value) : '—'}
                  </span>
                  {c.value == null && (
                    <span className="text-[10px] uppercase tracking-widest text-[color:var(--muted-2)]">
                      нет данных
                    </span>
                  )}
                </div>
                <Bar value={c.value} className="mt-2" height={4} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Рекомендации */}
      {recommendations.length > 0 && (
        <section className="rise mt-10" style={{ animationDelay: '80ms' }}>
          <SectionHead
            eyebrow="Что подтянуть первым"
            title="Рекомендации"
            hint="Отсортировано по приросту балла на единицу усилий. Значения условные — считает движок."
          />
          <ol className="mt-6 grid gap-3">
            {recommendations.map((r, idx) => (
              <li key={r.key}>
                <CardDiv tone="outline" className="flex flex-wrap items-center gap-5 p-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--ink)] text-sm font-semibold text-[color:var(--paper)]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium">{r.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                      <Chip tone="default">
                        {CATEGORY_META[r.category]?.title ?? r.category}
                      </Chip>
                      <Chip tone="outline">усилия: {EFFORT_LABELS[r.effort]}</Chip>
                      <span>метрика {METRIC_LABELS[r.key] ?? r.key}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold tabular-nums">+{r.gain.toFixed(1)}</div>
                    <div className="text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
                      к оценке
                    </div>
                  </div>
                </CardDiv>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Категории с метриками */}
      <section className="mt-12">
        <SectionHead
          eyebrow="Подробности"
          title="Категории и метрики"
          hint="Каждая метрика оценивается 0–100. Unknown исключается — веса остальных нормируются."
        />
        <div className="mt-6 grid gap-4">
          {sortedCategories.map((cat, idx) => (
            <CategoryBlock key={cat.key} category={cat} rank={idx + 1} />
          ))}
          {sortedCategories.length === 0 && (
            <EmptyState
              title="Данных не хватило"
              hint="Движок не смог собрать ни одной метрики. Скорее всего, репозиторий закрыт или недоступен."
            />
          )}
        </div>
      </section>

      {/* Missing */}
      {missing.length > 0 && (
        <section className="mt-12">
          <SectionHead eyebrow="Нет данных" title="Что не удалось собрать" />
          <CardDiv tone="paper" className="mt-6">
            <p className="text-sm text-[color:var(--muted)]">
              Эти поля не пришли из API SourceCraft или их нельзя было получить из репозитория.
              Метрики, зависящие от этих данных, помечены «нет данных».
            </p>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs">
              {missing.map((m) => (
                <li key={m}>
                  <Chip tone="outline" className="font-mono">
                    {m}
                  </Chip>
                </li>
              ))}
            </ul>
          </CardDiv>
        </section>
      )}

      {/* Публикация (только владелец) */}
      {isOwner && (
        <section className="mt-12">
          <SectionHead
            eyebrow="Управление"
            title="Публикация"
            hint="Опубликованный анализ виден всем в общем рейтинге. Имя автора не публикуется."
          />
          <CardDiv tone="outline" className="mt-6">
            <form action={toggleVisibilityAction} className="flex flex-wrap items-center gap-4">
              <input type="hidden" name="analysisId" value={analysis.id} />
              <input type="hidden" name="next" value={analysis.isPublic ? '0' : '1'} />
              <button
                type="submit"
                className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-[color:var(--paper)] hover:bg-[color:var(--ink-2)]"
              >
                {analysis.isPublic ? 'Скрыть из рейтинга' : 'Показать в рейтинге'}
              </button>
              <span className="text-sm text-[color:var(--muted)]">
                Сейчас: <strong className="text-[color:var(--ink)]">
                  {analysis.isPublic ? 'публично' : 'приватно'}
                </strong>
              </span>
            </form>
            {analysis.isPublic && repo && (
              <div className="mt-6 border-t border-[color:var(--line)] pt-6">
                <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                  Бейдж для README
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/badge/${repo.orgSlug}/${repo.repoSlug}.svg`}
                    alt={`Pulse ${analysis.score}`}
                    className="h-6"
                  />
                </div>
                <div className="mt-3">
                  <BadgeMarkdown org={repo.orgSlug} repo={repo.repoSlug} />
                </div>
              </div>
            )}
          </CardDiv>
        </section>
      )}
    </PageShell>
  );
}

// ---------- вспомогательные компоненты страницы ----------

function PageShell({
  title,
  org,
  repo,
  children,
}: {
  title: string;
  org?: string | null;
  repo?: string | null;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <nav className="text-sm text-[color:var(--muted)]">
        <Link href="/" className="hover:text-[color:var(--ink)]">
          Рейтинг
        </Link>
        {org && repo && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/r/${org}/${repo}`} className="hover:text-[color:var(--ink)]">
              {org}/{repo}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-[color:var(--ink-2)]">Анализ</span>
      </nav>
      <header className="mt-4">
        <Chip tone="outline">Отчёт Pulse</Chip>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">{title}</h1>
      </header>
      <div className="mt-10 flex flex-col gap-2">{children}</div>
    </main>
  );
}

function SectionHead({
  eyebrow,
  title,
  hint,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">{eyebrow}</div>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">{hint}</p>}
    </div>
  );
}

function CategoryBlock({ category, rank }: { category: CategoryScore; rank: number }) {
  const meta = CATEGORY_META[category.key];
  const known = category.metrics.filter((m) => !m.unknown) as Array<
    Extract<MetricScore, { unknown?: false }>
  >;
  const unknown = category.metrics.filter((m): m is Extract<MetricScore, { unknown: true }> =>
    Boolean(m.unknown),
  );

  return (
    <CardDiv tone="outline" className="p-0">
      <div className="flex flex-wrap items-center gap-4 border-b border-[color:var(--line)] p-6">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--panel)] text-sm font-semibold text-[color:var(--ink)]">
          {String(rank).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-medium">{meta?.title ?? category.key}</div>
          {meta?.blurb && (
            <div className="text-xs text-[color:var(--muted)]">{meta.blurb}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tabular-nums leading-none">
            {category.value != null ? Math.round(category.value) : '—'}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
            {category.value != null ? 'из 100' : 'нет данных'}
          </div>
        </div>
      </div>
      <div className="p-6">
        <Bar value={category.value} className="mb-6" height={6} />

        <ul className="divide-y divide-[color:var(--line)]">
          {known.map((m) => (
            <li key={m.key} className="grid grid-cols-[1fr_120px_56px] items-center gap-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-[15px]">{METRIC_LABELS[m.key] ?? m.key}</div>
                {m.hint && (
                  <div className="mt-0.5 truncate text-xs text-[color:var(--muted)]">{m.hint}</div>
                )}
              </div>
              <Bar value={m.value} height={4} />
              <div className="text-right text-sm font-semibold tabular-nums">
                {Math.round(m.value)}
              </div>
            </li>
          ))}
          {unknown.map((m) => (
            <li key={m.key} className="grid grid-cols-[1fr_120px_56px] items-center gap-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-[15px] text-[color:var(--muted)]">
                  {METRIC_LABELS[m.key] ?? m.key}
                </div>
                {m.hint && (
                  <div className="mt-0.5 truncate text-xs text-[color:var(--muted-2)]">
                    {m.hint}
                  </div>
                )}
              </div>
              <Bar value={null} height={4} muted />
              <div className="text-right text-xs uppercase tracking-widest text-[color:var(--muted-2)]">
                н/д
              </div>
            </li>
          ))}
          {category.metrics.length === 0 && (
            <li className="py-3 text-sm text-[color:var(--muted)]">Метрик пока нет.</li>
          )}
        </ul>
      </div>
    </CardDiv>
  );
}

function Pulse() {
  return (
    <span className="relative mt-1.5 inline-flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--ink)] opacity-30" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-[color:var(--ink)]" />
    </span>
  );
}

function verdict(score: number | null): string {
  if (score == null) return 'Данных пока недостаточно, чтобы вынести вердикт.';
  if (score >= 85) return 'Отлично: репозиторий здоровый по всем ключевым практикам.';
  if (score >= 70) return 'Хорошо: есть места, где можно подтянуться, но фундамент крепкий.';
  if (score >= 50) return 'Средне: несколько практик просели — самое время закрыть слабые места.';
  if (score >= 30) return 'Заметные проблемы: активность или базовая гигиена требуют внимания.';
  return 'Тревожно: репозиторий выглядит заброшенным или сырым. Начните с рекомендаций ниже.';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
}
