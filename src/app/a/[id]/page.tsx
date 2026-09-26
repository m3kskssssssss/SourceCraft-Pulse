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
import { AnalysisHistory } from '@/app/components/AnalysisHistory';
import { AnalysisRunner } from '@/app/components/AnalysisRunner';
import { BadgeMarkdown } from '@/app/components/BadgeMarkdown';
import { Bar, CardDiv, CategoryMini, Chip, EmptyState, ScoreDial } from '@/app/components/ui';
import type { CategoryScore, MetricScore, Recommendation } from '@/lib/scoring/types';
import type { Effort } from '@/lib/scoring/config';
import {
  CATEGORY_ACCENT_CLASS,
  CATEGORY_BLURBS,
  CATEGORY_TITLES,
  categoryOrder,
  pickCategoryValues,
} from '@/lib/category-meta';
import { describeMissingList } from '@/lib/missing-labels';
import { GitTree } from '@/app/components/GitTree';
import { ImprovementPr, type ProposalView } from '@/app/components/ImprovementPr';
import { ReevaluateButton } from '@/app/components/ReevaluateButton';
import { findOwnedRepoId } from '@/lib/ownership';
import {
  getImprovementContext,
  getLatestProposal,
  getPullRequestStatus,
  isPreparing,
  type ProposalRow,
} from '@/lib/improvements/for-analysis';
import type { ProposalItem, ProposalNotes } from '@/lib/improvements/proposal';
import { RatingStars } from '@/app/components/RatingStars';
import { CommentThread } from '@/app/components/CommentThread';
import { getCommentTree, getRatingSummary } from '@/lib/social';
import { getPublicUser } from '@/lib/users';
import type { GitGraph } from '@/lib/git/graph';
import type { CiFacts } from '@/lib/collect';
import type { SecurityScanResult, Severity } from '@/lib/security/types';
import { METRIC_LABELS } from '@/lib/metric-labels';
import { computeCoverage, LOW_COVERAGE } from '@/lib/scoring/coverage';
import { appSecCategoryScore } from '@/lib/scoring/metrics/security';
import { pickRatingExclusion, RATING_EXCLUSION_LABELS } from '@/lib/rating-eligibility';
import { getRepoHistory } from '@/lib/history';

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';
/** Кнопка «Создать pull request» — действие этой страницы: клон, коммит и push
 *  укладываются в минуту, но на большом репозитории нужен запас. Подготовка
 *  правок идёт отдельным маршрутом /api/improvements/<id> — ей нужно больше. */
export const maxDuration = 120;

/** Сколько работы потребует рекомендация. */
const EFFORT_LABELS: Record<Effort, string> = {
  trivial: 'минуты',
  small: 'час',
  medium: 'день',
  large: 'неделя и больше',
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

  // Прошлые прогоны этого же репозитория: свои видны любые, чужие — публичные.
  const history = repo
    ? await getRepoHistory({ org: repo.orgSlug, repo: repo.repoSlug, viewerId: userId ?? null })
    : [];

  // Отклик людей: звёзды и обсуждение. Нужны только готовому анализу, но
  // запрашиваются здесь же — до ветвления по статусу их всё равно не видно.
  const [rating, comments, viewer] = await Promise.all([
    getRatingSummary(id, userId ?? null),
    getCommentTree(id),
    userId ? getPublicUser(userId) : Promise.resolve(null),
  ]);
  const commentTotal = countComments(comments);

  const status = analysis.status;

  // ---------- незавершённые состояния ----------

  if (status === 'queued' || status === 'running') {
    return (
      <PageShell title={title} org={repo?.orgSlug} repo={repo?.repoSlug}>
        <CardDiv className="rise p-6 sm:p-8">
          {/* Расчёт запускает и опрашивает клиент: на Vercel анализ считается
              прямо в запросе к /api/analyses/<id>/run. */}
          <AnalysisRunner
            id={id}
            initialStatus={status}
            initialStage={analysis.stage}
            startedAt={analysis.createdAt.toISOString()}
          />
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
              {isOwner && repo && (
                <div className="mt-4">
                  <ReevaluateButton
                    org={repo.orgSlug}
                    repo={repo.repoSlug}
                    ownedId={await findOwnedRepoId(db, userId ?? null, { repositoryId: repo.id })}
                    label="Попробовать заново"
                    primary
                  />
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
  const missingNotes = describeMissingList(missing);

  // Путь создания репозитория: граф коммитов лежит в собранных фактах.
  const factsMeta = (analysis.metrics as { facts?: { gitGraph?: GitGraph } } | null)?.facts;
  const gitGraph = factsMeta?.gitGraph?.available ? factsMeta.gitGraph : null;

  // Находки ревьюера кода: их кладёт пайплайн ИИ рядом с сырыми выходами задач.
  const aiMeta = (
    analysis.metrics as {
      ai?: {
        codeFindings?: unknown;
        codeReviewStatus?: { ok?: boolean; reason?: string };
        unavailable?: boolean;
        reason?: string;
      };
    } | null
  )?.ai;
  const codeFindings = Array.isArray(aiMeta?.codeFindings)
    ? aiMeta.codeFindings.filter((item): item is string => typeof item === 'string')
    : [];
  // Почему ревью не состоялось — говорим прямо, а не оставляем пустое место.
  const codeReviewNote =
    aiMeta?.codeReviewStatus?.ok === false
      ? describeReviewFailure(aiMeta.codeReviewStatus.reason)
      : aiMeta?.unavailable
        ? aiMeta.reason === 'private_repo'
          ? 'Репозиторий приватный: его код во внешнюю модель мы не отправляем, поэтому ИИ-ревью не было.'
          : 'Слой ИИ не был настроен на момент прогона.'
        : null;

  // CI-прогоны — данные, которые SourceCraft отдаёт только участнику
  // репозитория. Показываем их владельцу отдельным блоком, в балл не входят.
  const ciMeta = isOwner
    ? (analysis.metrics as { facts?: { ci?: CiFacts } } | null)?.facts?.ci ?? null
    : null;
  // Справка по OSV.dev — вне балла. В старых прогонах OSV лежал в `security`
  // (тогда он ещё входил в балл), в новых — отдельным `dependencyAudit`.
  const factsSecurity = (
    analysis.metrics as {
      facts?: { security?: SecurityScanResult; dependencyAudit?: SecurityScanResult | null };
    } | null
  )?.facts;
  const dependencyAudit =
    factsSecurity?.dependencyAudit ??
    (factsSecurity?.security?.provider === 'osv_dev' ? factsSecurity.security : null);
  // AppSec: у приватного репозитория — это и есть данные категории, у
  // публичного — личный результат владельца, в балл и рейтинг не входит.
  const appSecFacts = (
    analysis.metrics as {
      facts?: {
        security?: SecurityScanResult;
        ownerAppSec?: SecurityScanResult | null;
        gitHistory?: { secretHits?: Array<{ name?: string }> };
      };
    } | null
  )?.facts;
  const scoredAppSec =
    appSecFacts?.security?.provider === 'sourcecraft_appsec' && appSecFacts.security.available
      ? appSecFacts.security
      : null;
  const ownerAppSec = isOwner ? (appSecFacts?.ownerAppSec ?? null) : null;
  const ownerAppSecScore = ownerAppSec?.available ? appSecCategoryScore(ownerAppSec) : null;
  // Полная оценка публичного репозитория для владельца: с AppSec и прогонами CI.
  const ownerFullRaw = isOwner
    ? (analysis.metrics as { owner?: { score?: unknown; categoryScores?: unknown } | null } | null)?.owner
    : null;
  const ownerFull =
    ownerFullRaw && typeof ownerFullRaw.score === 'number'
      ? {
          score: ownerFullRaw.score,
          categories: pickCategoryValues(ownerFullRaw.categoryScores),
          coverage: computeCoverage(ownerFullRaw.categoryScores),
        }
      : null;
  // Наш поиск строк, похожих на ключи: справка, не AppSec, на балл не влияет.
  const rawSecretHits = appSecFacts?.gitHistory?.secretHits;
  const secretHints = Array.isArray(rawSecretHits)
    ? [...new Set(rawSecretHits.map((s) => s?.name).filter((n): n is string => Boolean(n)))]
    : [];
  const coverage = computeCoverage(analysis.categoryScores);
  const unranked = pickRatingExclusion(analysis.metrics);
  const codeMeasured = pickCodeStats(
    (analysis.metrics as { facts?: { code?: Record<string, unknown> } } | null)?.facts?.code,
  );

  // Жанр репозитория: подборку ссылок оценкой не меряем.
  const kindMeta = (
    analysis.metrics as {
      kind?: { kind?: string; by?: string; summary?: string | null; topics?: unknown };
    } | null
  )?.kind;
  const kind = analysis.kind ?? kindMeta?.kind ?? 'project';
  const isMaterial = kind === 'material';
  const kindSummary = typeof kindMeta?.summary === 'string' ? kindMeta.summary : null;
  const kindTopics = Array.isArray(kindMeta?.topics)
    ? kindMeta.topics.filter((t): t is string => typeof t === 'string').slice(0, 6)
    : [];

  // Pull request с улучшениями — null, если смотрит не владелец.
  const improvements = await getImprovementContext(analysis.id, userId ?? null);
  const proposalRow = improvements && userId ? await getLatestProposal(analysis.id, userId) : null;
  const prStatus =
    improvements && userId && proposalRow?.status === 'submitted' && !proposalRow.mergedAnswer && proposalRow.prSlug
      ? await getPullRequestStatus(userId, improvements.org, improvements.repo, proposalRow.prSlug)
      : null;

  const sortedCategories = [...categoryScores].sort(
    (a, b) => categoryOrder(a.key) - categoryOrder(b.key),
  );

  return (
    <PageShell title={title} org={repo?.orgSlug} repo={repo?.repoSlug}>
      {/* Sunny score card */}
      <section className="rise overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
        {/* На телефоне круг и текст идут столбиком: в одну строку с кругом
            колонке оставалось около 80 пикселей, и звёзды уезжали за экран. */}
        <div className="flex flex-col items-start gap-6 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-10">
          {!isMaterial && <ScoreDial value={analysis.score} size={168} stroke={14} label="pulse" />}
          <div className="w-full min-w-0 sm:flex-1">
            <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
              {isMaterial ? 'Что это' : 'Итоговая оценка'}
            </div>
            {isMaterial ? (
              <div className="mt-1 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Полезный материал
              </div>
            ) : (
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-5xl font-semibold tabular-nums leading-none">
                  {analysis.score ?? '—'}
                </span>
                <span className="text-lg text-[color:var(--muted)]">/ 100</span>
              </div>
            )}
            {unranked && (
              <p className="mt-2 max-w-xl text-xs text-[color:var(--muted)]">{RATING_EXCLUSION_LABELS[unranked]}</p>
            )}
            {!isMaterial && coverage !== null && (
              <div
                className="mt-2 text-xs text-[color:var(--muted)]"
                title="Какая доля весов оценки измерена. Остальное — «нет данных»: оно не штрафует, но и не участвует в балле."
              >
                Покрытие данных: <span className="tabular-nums text-[color:var(--ink-2)]">{Math.round(coverage * 100)}%</span>
                {coverage < LOW_COVERAGE && ' — балл стоит на малой части данных'}
              </div>
            )}
            {/* Оценка людей стоит сразу под баллом: это ответ на него, а не
                отдельный раздел где-то внизу страницы. */}
            <div className="mt-4">
              <RatingStars
                analysisId={id}
                average={rating.average}
                count={rating.count}
                mine={rating.mine}
                canRate={Boolean(userId)}
              />
            </div>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[color:var(--ink-2)]">
              {isMaterial
                ? (kindSummary ??
                  'Репозиторий похож на подборку или конспект, а не на программу: инженерная оценка к нему неприменима.')
                : verdict(analysis.score)}
            </p>
            {isMaterial && kindTopics.length > 0 && (
              <ul className="mt-4 grid gap-1.5 text-sm text-[color:var(--ink-2)]">
                {kindTopics.map((topic) => (
                  <li key={topic} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--muted-2)]" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {isMaterial && <Chip tone="ink">Материал</Chip>}
              {repo?.language && <Chip tone="default">{repo.language}</Chip>}
              {analysis.finishedAt && (
                <Chip tone="default">Готово {formatDate(analysis.finishedAt.toISOString())}</Chip>
              )}
              <Chip tone={analysis.isPublic && !unranked ? 'ink' : 'outline'}>
                {!analysis.isPublic ? 'Приватно' : unranked ? 'Опубликован, без места в рейтинге' : 'В рейтинге'}
              </Chip>
              <a
                href={`/a/${analysis.id}/report.md`}
                className="rounded-full border border-[color:var(--line-2)] px-3 py-1 text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel)]"
              >
                Отчёт в Markdown
              </a>
              <Link
                href="/methodology"
                className="rounded-full border border-[color:var(--line-2)] px-3 py-1 text-[color:var(--ink-2)] transition hover:bg-[color:var(--panel)]"
              >
                Как считается балл
              </Link>
            </div>
          </div>
        </div>

        {/* мини-разбивка по категориям: материалу не показываем вовсе */}
        {!isMaterial && sortedCategories.length > 0 && (
          <div
            className={`grid grid-cols-2 gap-px border-t border-[color:var(--line)] bg-[color:var(--line)] ${
              sortedCategories.length > 4 ? 'sm:grid-cols-3 lg:grid-cols-6' : 'sm:grid-cols-4'
            }`}
          >
            {sortedCategories.map((c) => (
              <div
                key={c.key}
                className={`${CATEGORY_ACCENT_CLASS[c.key] ?? ''} min-w-0 bg-[color:var(--paper-2)] px-4 py-3 sm:px-5 sm:py-4`}
              >
                <div className="truncate text-xs uppercase tracking-wider text-[color:var(--muted)] sm:tracking-widest">
                  {CATEGORY_TITLES[c.key] ?? c.key}
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
                <Bar value={c.value} className="mt-2" height={4} accent />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* «Что это»: описание от модели — чем репозиторий занимается и из чего
          состоит. У материала оно стоит прямо в шапке вместо оценки; проекту
          отводим отдельную секцию: сначала балл, потом суть. Задача repo_kind
          пишет summary и topics для обоих жанров, показывали их только
          материалу. Нет описания (старый прогон или ИИ не отработал) —
          секции просто нет, заглушку не рисуем. */}
      {!isMaterial && kindSummary && (
        <section className="rise mt-10" style={{ animationDelay: '40ms' }}>
          <SectionHead
            eyebrow="Что это"
            title="О проекте"
            hint="Пересказ модели по README и структуре репозитория — на оценку не влияет."
          />
          <CardDiv tone="outline" className="mt-6">
            <p className="max-w-3xl text-[15px] leading-relaxed text-[color:var(--ink-2)]">
              {kindSummary}
            </p>
            {kindTopics.length > 0 && (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {kindTopics.map((topic) => (
                  <li key={topic} className="flex gap-2 text-sm text-[color:var(--ink-2)]">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--muted-2)]" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardDiv>
        </section>
      )}

      {/* Рекомендации: материалу нечего рекомендовать по инженерной части */}
      {!isMaterial && recommendations.length > 0 && (
        <section className="rise mt-10" style={{ animationDelay: '80ms' }}>
          <SectionHead
            eyebrow="Что подтянуть первым"
            title="Рекомендации"
            hint="Отсортировано по приросту балла на единицу усилий."
          />
          <ol className="mt-6 grid gap-3">
            {recommendations.map((r, idx) => (
              <li key={r.key}>
                <CardDiv
                  tone="outline"
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 p-4 sm:items-center sm:gap-x-5 sm:p-5"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--ink)] text-sm font-semibold text-[color:var(--paper)] sm:h-9 sm:w-9">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium leading-snug">{r.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                      <Chip tone="default">
                        {CATEGORY_TITLES[r.category] ?? r.category}
                      </Chip>
                      <Chip tone="outline">Трудозатраты: {EFFORT_LABELS[r.effort]}</Chip>
                      <span>Метрика: {METRIC_LABELS[r.key] ?? r.key}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold tabular-nums sm:text-2xl">+{r.gain.toFixed(1)}</div>
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

      {/* Личная часть оценки: приватность и CI — только владельцу. */}
      {isOwner && (repo?.isPrivate || ciMeta?.available || ownerAppSec || ownerFull || !isMaterial) && (
        <section className="rise mt-10" style={{ animationDelay: '90ms' }}>
          <SectionHead
            eyebrow="Видно только вам"
            title="Личные данные репозитория"
            hint={
              repo?.isPrivate
                ? 'Эти сведения SourceCraft отдаёт только участникам репозитория — по вашему токену. У приватного репозитория они входят в его личную оценку.'
                : 'Эти сведения SourceCraft отдаёт только участникам репозитория — по вашему токену. В балл и публичный рейтинг они не входят: иначе место в рейтинге зависело бы от того, кто запустил оценку.'
            }
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {ownerFull && !isMaterial && (
              <CardDiv tone="outline" className="sm:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Полная оценка — только для вас</div>
                    <p className="mt-1 max-w-xl text-sm text-[color:var(--muted)]">
                      Та же формула, но с находками SourceCraft AppSec и прогонами CI, которые платформа
                      отдаёт только участникам репозитория. Публичный балл — {analysis.score ?? '—'}: в нём
                      этих данных нет, как и у всех репозиториев рейтинга.
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-4xl font-semibold tabular-nums">{ownerFull.score}</span>
                    <span className="ml-1 text-sm text-[color:var(--muted)]">/ 100</span>
                    {ownerFull.coverage !== null && (
                      <div className="text-xs text-[color:var(--muted)]">
                        покрытие {Math.round(ownerFull.coverage * 100)}%
                      </div>
                    )}
                  </div>
                </div>
                <div className="@container mt-4">
                  <CategoryMini values={ownerFull.categories} size="md" />
                </div>
              </CardDiv>
            )}
            {repo?.isPrivate && (
              <CardDiv tone="outline">
                <div className="text-sm font-medium">🔒 Приватный репозиторий</div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Оценка посчитана правами вашего токена и не публикуется: её нет в рейтинге, бейдже и
                  на публичных страницах. Код не отправлялся ни во внешнюю модель, ни в базу
                  уязвимостей.
                </p>
              </CardDiv>
            )}
            {ciMeta?.available && (
              <CardDiv tone="outline">
                <div className="text-sm font-medium">CI/CD в SourceCraft</div>
                {ciMeta.sampled === 0 ? (
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    Прогонов CI пока не было. Настройте CI в репозитории — здесь появится доля
                    успешных запусков.
                  </p>
                ) : (
                  <>
                    <div className="mt-2 text-2xl font-semibold tabular-nums">
                      {Math.round(
                        (ciMeta.succeeded / Math.max(1, ciMeta.succeeded + ciMeta.failed)) * 100,
                      )}
                      %
                      <span className="ml-2 text-xs font-normal text-[color:var(--muted)]">
                        успешных из последних {ciMeta.sampled}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      Успешно {ciMeta.succeeded} · упало {ciMeta.failed}
                      {ciMeta.other > 0 && ` · прочие ${ciMeta.other}`}
                      {ciMeta.lastStatus && ` · последний: ${ciMeta.lastStatus}`}
                    </p>
                  </>
                )}
              </CardDiv>
            )}
            {!repo?.isPrivate && !ownerAppSec && (
              <CardDiv tone="outline" className="sm:col-span-2">
                <div className="text-sm font-medium">Безопасность по SourceCraft AppSec</div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  В этом прогоне AppSec не запрашивали: оценка шла без вашего токена SourceCraft. Токен
                  подставляется, только когда репозиторий подтверждён как ваш в «Моих репозиториях»,
                  токен сохранён и действует, а оценку запускаете вы. Проверьте это и нажмите
                  «Оценить заново».
                </p>
              </CardDiv>
            )}
            {ownerAppSec && (
              <CardDiv tone="outline" className="sm:col-span-2">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="text-sm font-medium">Безопасность по SourceCraft AppSec</div>
                  {ownerAppSecScore !== null && (
                    <div className="text-right" title="Та же формула, что в оценке. Для публичного репозитория в балл и рейтинг не входит.">
                      <span className="text-2xl font-semibold tabular-nums">{ownerAppSecScore}</span>
                      <span className="ml-1 text-xs text-[color:var(--muted)]">/ 100 · только для вас</span>
                    </div>
                  )}
                </div>
                {ownerAppSec.available ? (
                  <AppSecFindingsBlock
                    result={ownerAppSec}
                    hint="Открытые находки последнего завершённого скана. Для публичного репозитория в балл не входят."
                    bare
                  />
                ) : (
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {describeAppSecGap(ownerAppSec.missing[0] ?? ownerAppSec.errors[0])}
                  </p>
                )}
              </CardDiv>
            )}
          </div>
        </section>
      )}

      {/* Pull request с улучшениями — только подтверждённому владельцу. */}
      {improvements && (
        <section id="pr" className="rise mt-10 scroll-mt-24" style={{ animationDelay: '100ms' }}>
          <SectionHead
            eyebrow="Сделаем за вас"
            title="Предложить pull request"
            hint="Pulse подготовит правки документации и кода: посмотрите каждую, оставьте нужные — появится ветка и PR на SourceCraft, а слить его или нет, решаете вы."
          />
          <div className="mt-6">
            <ImprovementPr
              analysisId={analysis.id}
              slug={`${improvements.org}/${improvements.repo}`}
              repoUrl={improvements.webUrl}
              blocker={improvements.blocker}
              isPrivate={improvements.isPrivate}
              proposal={proposalRow ? toProposalView(proposalRow) : null}
              prStatus={prStatus}
            />
          </div>
        </section>
      )}

      {/* Категории и метрики: материалу их не показываем — оценивать его нечем,
          а таблица из «н/д» только создаёт вид оценки. */}
      {!isMaterial && (
        <section className="mt-12">
          <SectionHead
            eyebrow="Подробности"
            title="Категории и метрики"
            hint="Каждая метрика оценивается 0–100. Метрики без данных исключаются — веса остальных нормируются. Категорию можно свернуть, нажав на её заголовок; категории без данных свёрнуты сразу."
          />
          <div className="mt-6 grid gap-4">
            {sortedCategories.map((cat, idx) => (
              <CategoryBlock
                key={cat.key}
                category={cat}
                rank={idx + 1}
                findings={cat.key === 'code' ? codeFindings : []}
                note={
                  cat.key === 'code'
                    ? codeReviewNote
                    : cat.key === 'security' && cat.value == null
                      ? repo?.isPrivate
                        ? describeAppSecGap(appSecFacts?.security?.missing?.[0])
                        : SECURITY_NO_APPSEC_NOTE
                      : null
                }
                stats={cat.key === 'code' ? codeMeasured : []}
                extra={
                  cat.key === 'security' ? (
                    <>
                      {scoredAppSec && (
                        <AppSecFindingsBlock
                          result={scoredAppSec}
                          title="Находки SourceCraft AppSec"
                          hint="Открытые находки последнего завершённого скана — по ним посчитана категория."
                        />
                      )}
                      {!repo?.isPrivate && <DependencyAuditBlock audit={dependencyAudit} />}
                      {secretHints.length > 0 && <SecretHintsBlock names={secretHints} />}
                    </>
                  ) : null
                }
              />
            ))}
            {sortedCategories.length === 0 && (
              <EmptyState
                title="Метрик нет"
                hint="Ни одной метрики собрать не удалось: репозиторий закрыт или недоступен."
              />
            )}
          </div>
        </section>
      )}

      {/* История прогонов */}
      {history.length > 1 && (
        <section className="mt-12">
          <SectionHead
            eyebrow="Динамика"
            title="История оценок"
            hint="Доступные вам прогоны этого репозитория."
          />
          <div className="mt-6">
            <AnalysisHistory items={history} currentId={analysis.id} />
          </div>
        </section>
      )}

      {/* Путь создания */}
      {gitGraph && gitGraph.commits.length > 1 && (
        <section className="mt-12">
          <SectionHead
            eyebrow="Путь"
            title="Как рос репозиторий"
            hint="История ветки по умолчанию из клона. Ветвления видно там, где ветку слили обратно; коммит можно открыть."
          />
          <div className="mt-6">
            <GitTree graph={gitGraph} webUrl={repo?.webUrl ?? null} />
          </div>
        </section>
      )}

      {/* Что не удалось собрать. Пробелов нет — секции нет: сообщать «всё
          собрали» отдельным блоком незачем, это и так видно по метрикам. */}
      {missingNotes.length > 0 && (
        <section className="mt-12">
          <SectionHead
            eyebrow="Пробелы"
            title="Что не удалось собрать"
            hint="Метрики, зависящие от этих данных, помечены «н/д» и не влияют на балл."
          />
          <CardDiv tone="paper" className="mt-6">
            <ul className="grid gap-2 text-sm">
              {missingNotes.map((note) => (
                <li key={note.raw} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[color:var(--ink-2)]">{note.text}</span>
                  {note.detail && (
                    <span className="break-all font-mono text-xs text-[color:var(--muted-2)]">
                      {note.detail}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardDiv>
        </section>
      )}

      {/* Публикация (только владелец) */}
      {/* Приватный репозиторий не публикуется — переключателя нет. */}
      {isOwner && !repo?.isPrivate && (
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
                  {analysis.isPublic ? 'В рейтинге' : 'Приватно'}
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

      {/* Обсуждение — в самом низу и с якорем: на него ведёт счётчик
          комментариев из карточки рейтинга. */}
      <section id="comments" className="mt-14 scroll-mt-24 border-t border-[color:var(--line)] pt-10">
        <CommentThread
          analysisId={id}
          comments={comments}
          viewer={viewer}
          total={commentTotal}
        />
      </section>
    </PageShell>
  );
}

/** Сколько всего живых комментариев в дереве, включая ответы. */
function countComments(nodes: Awaited<ReturnType<typeof getCommentTree>>): number {
  let total = 0;
  for (const node of nodes) {
    if (!node.deleted) total += 1;
    for (const reply of node.replies) {
      if (!reply.deleted) total += 1;
    }
  }
  return total;
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
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="text-sm text-[color:var(--muted)] [overflow-wrap:anywhere]">
        <Link href="/rating" className="hover:text-[color:var(--ink)]">
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
        {/* Имя репозитория — одно длинное «слово»: без переноса по символам
            оно раздвигало страницу вбок. */}
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
          {title}
        </h1>
      </header>
      <div className="mt-6 flex flex-col gap-2 sm:mt-10">{children}</div>
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

function CategoryBlock({
  category,
  rank,
  findings = [],
  note = null,
  stats = [],
  extra = null,
}: {
  category: CategoryScore;
  rank: number;
  /** Дополнительный блок под метриками — справка, в балл не входит. */
  extra?: React.ReactNode;
  /** Наблюдения модели по этой категории — сейчас приходят только для кода. */
  findings?: string[];
  /** Почему ревью не состоялось. */
  note?: string | null;
  /** Измеренные по исходникам числа — показываем рядом с оценкой модели. */
  stats?: Array<{ label: string; value: string }>;
}) {
  const title = CATEGORY_TITLES[category.key] ?? category.key;
  const blurb = CATEGORY_BLURBS[category.key];
  const accentClass = CATEGORY_ACCENT_CLASS[category.key] ?? '';
  const known = category.metrics.filter((m) => !m.unknown) as Array<
    Extract<MetricScore, { unknown?: false }>
  >;
  const unknown = category.metrics.filter((m): m is Extract<MetricScore, { unknown: true }> =>
    Boolean(m.unknown),
  );

  // Категория без данных по умолчанию свёрнута: развёрнутый столбик «н/д»
  // только отодвигает то, что измерено. Свернуть можно любую — это <details>,
  // он работает без скриптов и с клавиатуры.
  const hasData = category.value != null;

  return (
    <CardDiv tone="outline" className={`${accentClass} p-0`}>
      <details open={hasData} className="group/cat">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[inherit] p-4 transition hover:bg-[color:var(--panel)] group-open/cat:border-b group-open/cat:border-[color:var(--line)] sm:gap-4 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold sm:h-10 sm:w-10"
          style={{
            background: 'var(--accent-soft, var(--panel))',
            color: 'var(--accent, var(--ink))',
          }}
        >
          {String(rank).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-medium">{title}</div>
          {blurb && <div className="text-xs text-[color:var(--muted)]">{blurb}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold tabular-nums leading-none sm:text-3xl">
            {category.value != null ? Math.round(category.value) : '—'}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
            {category.value != null ? 'из 100' : 'нет данных'}
          </div>
        </div>
        <Chevron className="shrink-0 text-[color:var(--muted)] transition-transform group-open/cat:rotate-180" />
      </summary>
      <div className="p-4 sm:p-6">
        <Bar value={category.value} className="mb-4 sm:mb-6" height={6} accent />

        <ul className="divide-y divide-[color:var(--line)]">
          {known.map((m) => (
            <li
              key={m.key}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[1fr_120px_56px]"
            >
              <div className="min-w-0">
                <div className="text-[15px] leading-snug">{METRIC_LABELS[m.key] ?? m.key}</div>
                {m.hint && (
                  <div className="mt-0.5 text-xs leading-snug text-[color:var(--muted)]">
                    {m.hint}
                  </div>
                )}
              </div>
              <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                <Bar value={m.value} height={4} accent />
              </div>
              <div className="text-right text-sm font-semibold tabular-nums">
                {Math.round(m.value)}
              </div>
            </li>
          ))}
          {/* Метрики без данных у категории с данными свёрнуты в одну строку. */}
          {!hasData && unknown.map((m) => <UnknownMetricRow key={m.key} metric={m} />)}
          {hasData && unknown.length > 0 && (
            <li className="py-1">
              <details className="group/nd">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-2 text-sm text-[color:var(--muted)] [&::-webkit-details-marker]:hidden">
                  <span>Без данных: {unknown.length}</span>
                  <Chevron className="shrink-0 transition-transform group-open/nd:rotate-180" />
                </summary>
                <ul className="divide-y divide-[color:var(--line)]">
                  {unknown.map((m) => (
                    <UnknownMetricRow key={m.key} metric={m} />
                  ))}
                </ul>
              </details>
            </li>
          )}
          {category.metrics.length === 0 && (
            <li className="py-3 text-sm text-[color:var(--muted)]">Метрик пока нет.</li>
          )}
        </ul>

        {stats.length > 0 && (
          <div className="mt-6 border-t border-[color:var(--line)] pt-5">
            <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
              Измерено по исходникам
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 md:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[color:var(--muted)]">{stat.label}</dt>
                  <dd className="tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {note && (
          <div className="mt-6 border-t border-[color:var(--line)] pt-5 text-sm text-[color:var(--muted)]">
            {note}
          </div>
        )}

        {findings.length > 0 && (
          <div className="mt-6 border-t border-[color:var(--line)] pt-6">
            <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
              Что увидел ревьюер
            </div>
            <ul className="mt-3 grid gap-2.5 text-sm leading-relaxed text-[color:var(--ink-2)]">
              {findings.map((finding) => (
                <li key={finding} className="flex gap-3">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: 'var(--accent, var(--ink))' }}
                  />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {extra}
      </div>
      </details>
    </CardDiv>
  );
}

const SECURITY_NO_APPSEC_NOTE =
  'Балл безопасности считается только по данным SourceCraft AppSec. Результаты AppSec платформа отдаёт лишь участникам репозитория, поэтому в публичной оценке категория исключена, а веса остальных нормированы. Владелец видит свои находки AppSec в блоке «Видно только вам».';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'unknown'];
const DEPENDENCY_AUDIT_LIST_LIMIT = 8;

/**
 * Справка по OSV.dev: известные уязвимости в версиях зависимостей из
 * lock-файлов. Это не SourceCraft AppSec и не скан кода — в балл не входит.
 */
function DependencyAuditBlock({ audit }: { audit: SecurityScanResult | null }) {
  const counts = new Map<Severity, number>();
  for (const v of audit?.vulnerabilities ?? []) {
    counts.set(v.severity, (counts.get(v.severity) ?? 0) + 1);
  }
  const listed = [...(audit?.vulnerabilities ?? [])]
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .slice(0, DEPENDENCY_AUDIT_LIST_LIMIT);

  let body: React.ReactNode;
  if (!audit) {
    body = 'Проверку зависимостей в этом прогоне не делали.';
  } else if (!audit.available) {
    body = 'Проверка по OSV.dev не удалась — база не ответила.';
  } else if (audit.totalScanned === 0) {
    body = 'Lock-файлов, которые мы умеем разбирать (package-lock.json, pnpm-lock.yaml), нет — проверять было нечего.';
  } else if (audit.vulnerabilities.length === 0) {
    body = `Проверено пакетов: ${audit.totalScanned}. Известных уязвимостей не найдено.`;
  } else {
    body = (
      <>
        <div>
          Проверено пакетов: {audit.totalScanned}. Найдено:{' '}
          {SEVERITY_ORDER.filter((s) => counts.has(s))
            .map((s) => `${s} ${counts.get(s)}`)
            .join(' · ')}
        </div>
        <ul className="mt-3 grid gap-1.5">
          {listed.map((v) => (
            <li key={`${v.id}:${v.package}@${v.version}`} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[10px] uppercase tracking-widest">{v.severity}</span>
              <a
                href={`https://osv.dev/vulnerability/${encodeURIComponent(v.id)}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs underline decoration-dotted underline-offset-2"
              >
                {v.id}
              </a>
              <span className="break-all font-mono text-xs">
                {v.package}
                {v.version ? `@${v.version}` : ''}
              </span>
              {v.fixedIn && v.fixedIn.length > 0 && (
                <span className="text-xs">исправлено в {v.fixedIn.join(', ')}</span>
              )}
            </li>
          ))}
        </ul>
        {audit.vulnerabilities.length > listed.length && (
          <div className="mt-2 text-xs">
            …и ещё {audit.vulnerabilities.length - listed.length}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mt-6 border-t border-[color:var(--line)] pt-5">
      <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
        Справка: зависимости по данным OSV.dev
      </div>
      <div className="mt-1 text-xs text-[color:var(--muted-2)]">
        Не SourceCraft AppSec и не проверка кода — сверка версий из lock-файлов с открытой базой
        уязвимостей. На балл не влияет.
      </div>
      <div className="mt-3 text-sm text-[color:var(--ink-2)]">{body}</div>
    </div>
  );
}

/** Строка метрики без данных: название, почему нет данных, пустая шкала. */
function UnknownMetricRow({ metric }: { metric: Extract<MetricScore, { unknown: true }> }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[1fr_120px_56px]">
      <div className="min-w-0">
        <div className="text-[15px] leading-snug text-[color:var(--muted)]">
          {METRIC_LABELS[metric.key] ?? metric.key}
        </div>
        {metric.hint && (
          <div className="mt-0.5 text-xs leading-snug text-[color:var(--muted-2)]">{metric.hint}</div>
        )}
      </div>
      <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
        <Bar value={null} height={4} muted />
      </div>
      <div className="text-right text-xs uppercase tracking-widest text-[color:var(--muted-2)]">н/д</div>
    </li>
  );
}

/** Стрелка раскрытия: смотрит вниз, у раскрытого блока поворачивается вверх. */
function Chevron({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const APPSEC_KIND_LABELS: Record<string, string> = {
  secret: 'секрет',
  sca: 'зависимость',
  sast: 'код',
  other: 'прочее',
};
const APPSEC_LIST_LIMIT = 10;

/** Открытые находки SourceCraft AppSec: сводка по критичности и первые из списка. */
function AppSecFindingsBlock({
  result,
  title,
  hint,
  bare = false,
}: {
  result: SecurityScanResult;
  title?: string;
  hint: string;
  /** Без собственной рамки и заголовка — внутри карточки. */
  bare?: boolean;
}) {
  const counts = new Map<Severity, number>();
  for (const v of result.vulnerabilities) counts.set(v.severity, (counts.get(v.severity) ?? 0) + 1);
  const secrets = result.vulnerabilities.filter((v) => v.kind === 'secret').length;
  const listed = [...result.vulnerabilities]
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .slice(0, APPSEC_LIST_LIMIT);

  const body =
    result.vulnerabilities.length === 0 ? (
      <div>Открытых находок нет{result.scannedAt ? ` · скан от ${formatDate(result.scannedAt)}` : ''}</div>
    ) : (
      <>
        <div>
          Открыто: {result.vulnerabilities.length}
          {' · '}
          {SEVERITY_ORDER.filter((s) => counts.has(s))
            .map((s) => `${s} ${counts.get(s)}`)
            .join(' · ')}
          {secrets > 0 && ` · секретов ${secrets}`}
          {result.scannedAt && ` · скан от ${formatDate(result.scannedAt)}`}
        </div>
        <ul className="mt-3 grid gap-1.5">
          {listed.map((v, i) => (
            <li key={`${v.id}:${v.file ?? ''}:${i}`} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[10px] uppercase tracking-widest">{v.severity}</span>
              <span className="text-xs text-[color:var(--muted)]">{APPSEC_KIND_LABELS[v.kind ?? 'other']}</span>
              <span className="font-mono text-xs">{v.summary ?? v.id}</span>
              {v.file && <span className="break-all font-mono text-xs text-[color:var(--muted)]">{v.file}</span>}
            </li>
          ))}
        </ul>
        {result.vulnerabilities.length > listed.length && (
          <div className="mt-2 text-xs">…и ещё {result.vulnerabilities.length - listed.length}</div>
        )}
      </>
    );

  if (bare) {
    return (
      <div className="mt-2 text-sm text-[color:var(--ink-2)]">
        <div className="mb-2 text-xs text-[color:var(--muted-2)]">{hint}</div>
        {body}
      </div>
    );
  }
  return (
    <div className="mt-6 border-t border-[color:var(--line)] pt-5">
      <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">{title}</div>
      <div className="mt-1 text-xs text-[color:var(--muted-2)]">{hint}</div>
      <div className="mt-3 text-sm text-[color:var(--ink-2)]">{body}</div>
    </div>
  );
}

/**
 * Наш собственный поиск строк, похожих на ключи, в истории коммитов. Это не
 * AppSec — по ТЗ собственной проверкой его не подменяем, поэтому только справка.
 */
function SecretHintsBlock({ names }: { names: string[] }) {
  return (
    <div className="mt-6 border-t border-[color:var(--line)] pt-5">
      <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
        Справка: строки, похожие на ключи
      </div>
      <div className="mt-1 text-xs text-[color:var(--muted-2)]">
        Наша проверка истории коммитов по шаблонам, не SourceCraft AppSec. На балл не влияет — но если
        это настоящие ключи, их стоит отозвать.
      </div>
      <div className="mt-3 font-mono text-xs text-[color:var(--ink-2)]">{names.join(', ')}</div>
    </div>
  );
}

/** Почему AppSec не дал данных — человеческим языком. */
function describeAppSecGap(reason: string | undefined): string {
  switch (reason) {
    case 'appsec_no_scan':
      return 'В AppSec нет скана этого репозитория: сканирование не включено или ещё не запускалось. У публичных репозиториев AppSec бесплатный — проверьте «Настройки безопасности» репозитория. У приватных он работает только при подключённом дополнении безопасности SourceCraft.';
    case 'appsec_scan_not_finished':
      return 'Последний скан AppSec ещё идёт или завершился с ошибкой — дождитесь окончания и оцените заново.';
    case 'appsec_forbidden':
      return 'AppSec отказал в доступе по вашему токену. У приватного репозитория так бывает без дополнения безопасности SourceCraft: без него AppSec такие репозитории не сканирует.';
    case 'sourcecraft_appsec_needs_owner_token':
      return 'Для AppSec нужен ваш токен SourceCraft: подключите его в «Моих репозиториях» и оцените заново.';
    case 'appsec_no_repository_id':
      return 'API SourceCraft не вернул идентификатор репозитория — AppSec запросить не удалось.';
    default:
      return 'AppSec не ответил — попробуйте оценить репозиторий заново позже.';
  }
}

/** Почему ревью кода не прошло — человеческим языком. */
function describeReviewFailure(reason?: string): string {
  if (!reason) return 'Ревью кода не прошло.';
  if (reason === 'no_code_sample') {
    return 'Ревью кода не делали: исходники прочитать не удалось.';
  }
  if (reason.includes('budget')) {
    return 'Ревью кода не делали: исчерпан месячный лимит расходов на ИИ.';
  }
  return `Ревью кода не прошло: ${reason.slice(0, 160)}`;
}

/** Числа по исходникам из собранных фактов — в подписи для страницы. */
function pickCodeStats(code?: Record<string, unknown>): Array<{ label: string; value: string }> {
  if (!code || code.available !== true) return [];
  const num = (key: string): number | null =>
    typeof code[key] === 'number' ? (code[key] as number) : null;

  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: number | null, suffix = '') => {
    if (value !== null) rows.push({ label, value: `${value}${suffix}` });
  };

  push('Файлов кода', num('sourceFiles'));
  push('Из них прочитано', num('scannedFiles'));
  push('Файлов тестов', num('testFiles'));
  push('Медиана файла', num('medianFileLines'), ' строк');
  push('Длиннее 500 строк', num('longFileSharePercent'), '%');
  push('Комментариев', num('commentSharePercent'), '%');
  push('TODO на 1000 строк', num('todoPerKiloLines'));
  return rows;
}

function verdict(score: number | null): string {
  if (score == null) return 'Данных для вывода недостаточно.';
  if (score >= 85) return 'Здоровый репозиторий: ключевые практики на месте.';
  if (score >= 70) return 'Крепкая основа, отдельные практики просели.';
  if (score >= 50) return 'Средний уровень: слабых мест несколько.';
  if (score >= 30) return 'Заметные пробелы в активности или базовой гигиене.';
  return 'Репозиторий выглядит заброшенным или сырым.';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Строка предложения для клиента: без содержимого файлов, только дифф. */
function toProposalView(row: ProposalRow): ProposalView {
  const items = (Array.isArray(row.items) ? row.items : []) as ProposalItem[];
  const prItems = (row.prItems ?? {}) as { applied?: string[]; skipped?: Array<{ path: string; reason: string }> };
  const status =
    row.status === 'preparing' && !isPreparing(row) ? 'failed' : (row.status as ProposalView['status']);
  return {
    id: row.id,
    status,
    stage: row.stage,
    startedAt: row.createdAt.toISOString(),
    error: status === 'failed' && row.status === 'preparing' ? 'подготовка прервалась' : row.error,
    items: items.map(({ content: _content, ...rest }) => rest),
    notes: (row.notes as ProposalNotes | null) ?? null,
    prBranch: row.prBranch,
    prSlug: row.prSlug,
    applied: prItems.applied ?? [],
    skipped: prItems.skipped ?? [],
    mergedAnswer: row.mergedAnswer === 'yes' || row.mergedAnswer === 'no' ? row.mergedAnswer : null,
    reevaluationId: row.reevaluationId,
  };
}
