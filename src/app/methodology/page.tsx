// Методика: как считается Repo Health Score. Числа берутся из конфигурации
// движка, а не переписываются руками — страница не может разойтись с расчётом.

import type { Metadata } from 'next';
import Link from 'next/link';
import { CardDiv } from '../components/ui';
import {
  CATEGORY_ACCENT_CLASS,
  CATEGORY_BLURBS,
  CATEGORY_ORDER,
  CATEGORY_TITLES,
  categoryWeightPercent,
} from '@/lib/category-meta';
import { metricLabel } from '@/lib/metric-labels';
import {
  ACTIVITY_WEIGHTS,
  CI_WEIGHTS,
  CODE_WEIGHTS,
  DOCS_WEIGHTS,
  ISSUES_WEIGHTS,
  PENALTIES,
  SECURITY_WEIGHTS,
} from '@/lib/scoring/config';
import { LOW_COVERAGE } from '@/lib/scoring/coverage';
import type { CategoryKey } from '@/lib/scoring/types';

export const metadata: Metadata = {
  title: 'Как считается балл — Pulse',
  description:
    'Методика Repo Health Score: шесть категорий ТЗ, веса, метрики, штрафы, «нет данных» и источники данных.',
};

/** Метрика → её вес внутри категории. Порядок — как на странице анализа. */
const CATEGORY_METRICS: Record<CategoryKey, Array<[string, number]>> = {
  security: [
    ['security.critical_vulns', SECURITY_WEIGHTS.criticalVulns],
    ['security.high_vulns', SECURITY_WEIGHTS.highVulns],
    ['security.medium_vulns', SECURITY_WEIGHTS.mediumVulns],
    ['security.secrets', SECURITY_WEIGHTS.secrets],
  ],
  code: [
    ['code.tests', CODE_WEIGHTS.tests],
    ['code.file_size', CODE_WEIGHTS.fileSize],
    ['code.comments', CODE_WEIGHTS.comments],
    ['code.todo_debt', CODE_WEIGHTS.todoDebt],
    ['code.has_linter', CODE_WEIGHTS.hasLinter],
    ['code.build_manifest', CODE_WEIGHTS.hasBuildManifest],
    ['code.gitignore', CODE_WEIGHTS.hasGitignore],
    ['code.editorconfig', CODE_WEIGHTS.hasEditorConfig],
    ['code.lockfile', CODE_WEIGHTS.lockfile],
    ['code.dependency_bot', CODE_WEIGHTS.dependencyBot],
  ],
  activity: [
    ['activity.commits_90d', ACTIVITY_WEIGHTS.commitsLast90Days],
    ['activity.active_authors', ACTIVITY_WEIGHTS.activeAuthors],
    ['activity.freshness', ACTIVITY_WEIGHTS.freshness],
    ['activity.bus_factor', ACTIVITY_WEIGHTS.busFactor],
    ['activity.releases', ACTIVITY_WEIGHTS.releases],
    ['activity.pr_flow', ACTIVITY_WEIGHTS.pullRequestFlow],
  ],
  docs: [
    ['docs.readme', DOCS_WEIGHTS.readme],
    ['docs.license', DOCS_WEIGHTS.license],
    ['docs.contributing', DOCS_WEIGHTS.contributing],
    ['docs.changelog', DOCS_WEIGHTS.changelog],
    ['docs.usage_examples', DOCS_WEIGHTS.usageExamples],
    ['docs.docs_dir', DOCS_WEIGHTS.docsDir],
    ['docs.code_of_conduct', DOCS_WEIGHTS.codeOfConduct],
    ['docs.issue_template', DOCS_WEIGHTS.issueTemplate],
    ['docs.repo_description', DOCS_WEIGHTS.repoDescription],
  ],
  ci: [
    ['ci.config', CI_WEIGHTS.configPresent],
    ['ci.runs_tests', CI_WEIGHTS.runsTests],
    ['ci.runs_lint', CI_WEIGHTS.runsLint],
    ['ci.pr_checks', CI_WEIGHTS.pullRequestChecks],
    ['ci.runs_success', CI_WEIGHTS.runsSuccess],
  ],
  issues: [
    ['issues.closed_share', ISSUES_WEIGHTS.closedShare],
    ['issues.stale_share', ISSUES_WEIGHTS.staleShare],
    ['issues.reaction_time', ISSUES_WEIGHTS.reactionTime],
  ],
};

/** Что особенного у категории — одной фразой под списком метрик. */
const CATEGORY_NOTES: Partial<Record<CategoryKey, string>> = {
  security:
    'Только SourceCraft AppSec. Его результаты платформа отдаёт лишь участникам репозитория, поэтому у публичных репозиториев категория — «нет данных» у всех одинаково и места в рейтинге не меняет; владелец видит свои находки и личный балл отдельно. Приватный репозиторий считается по токену владельца — если у него подключено дополнение безопасности SourceCraft: без него AppSec приватные репозитории не сканирует.',
  code:
    'Если модель провела ревью выборки исходников, её балл заменяет измеренные метрики категории целиком; не получилось — категория считается по метрикам.',
  docs: 'Если модель оценила README по рубрике, её балл заменяет метрики категории; иначе — по метрикам.',
  ci: 'Конфиг пайплайна публичен и считается у всех. Прогоны CI видны только участникам: у публичного репозитория в балл не входят, у приватного — считаются по токену владельца. Без конфига CI остальные метрики неприменимы.',
  issues: 'Считается по выборке задач из API. Репозиторий без трекера не штрафуется: категория «нет данных».',
};

export default function MethodologyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 sm:px-6">
      <section className="pt-10 pb-8 sm:pt-16">
        <h1 className="rise text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Как считается балл
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-2)]">
          Repo Health Score — число от 0 до 100 по шести категориям технического задания. Расчёт
          детерминирован: одни и те же данные всегда дают один и тот же балл.
        </p>
      </section>

      <Section title="Формула">
        <CardDiv tone="outline">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-[color:var(--ink-2)]">
            {'Категория = Σ(вес метрики × балл метрики) / Σ(вес измеренных метрик)\n' +
              'Итог      = Σ(вес категории × балл категории) / Σ(вес измеренных категорий) − штрафы\n' +
              'Итог обрезается до 0…100 и округляется до целого.'}
          </pre>
        </CardDiv>
        <ul className="mt-4 grid gap-2 text-sm leading-relaxed text-[color:var(--ink-2)]">
          <li>
            <strong>«Нет данных» — не ноль.</strong> Метрика без данных выпадает из расчёта, а её вес
            делится между измеренными. Так же с категорией целиком.
          </li>
          <li>
            <strong>Покрытие</strong> рядом с баллом показывает, какая доля весов реально измерена. Ниже{' '}
            {Math.round(LOW_COVERAGE * 100)}% балл стоит на малой части данных — страница анализа об этом
            предупреждает.
          </li>
        </ul>
      </Section>

      <Section title="Категории и веса">
        <div className="grid gap-4">
          {CATEGORY_ORDER.map((key) => (
            <CardDiv key={key} tone="outline" className={CATEGORY_ACCENT_CLASS[key]}>
              <div className="flex items-baseline justify-between gap-4">
                <div className="text-lg font-medium">{CATEGORY_TITLES[key]}</div>
                <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                  {categoryWeightPercent(key)}%
                </div>
              </div>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{CATEGORY_BLURBS[key]}</p>
              <ul className="mt-4 grid gap-1.5 text-sm">
                {CATEGORY_METRICS[key].map(([metric, weight]) => (
                  <li key={metric} className="flex items-baseline justify-between gap-4">
                    <span className="text-[color:var(--ink-2)]">{metricLabel(metric)}</span>
                    <span className="tabular-nums text-[color:var(--muted)]">{Math.round(weight * 100)}%</span>
                  </li>
                ))}
              </ul>
              {CATEGORY_NOTES[key] && (
                <p className="mt-4 border-t border-[color:var(--line)] pt-3 text-xs leading-relaxed text-[color:var(--muted)]">
                  {CATEGORY_NOTES[key]}
                </p>
              )}
            </CardDiv>
          ))}
        </div>
      </Section>

      <Section title="Штрафы">
        <ul className="grid gap-2 text-sm leading-relaxed text-[color:var(--ink-2)]">
          <li>−{PENALTIES.secretInCode} — AppSec нашёл открытый секрет в репозитории.</li>
          <li>−{PENALTIES.criticalVulnUnfixed} — AppSec нашёл открытую critical-уязвимость.</li>
          <li>−{PENALTIES.missingLicense} — нет файла LICENSE: открытый код без лицензии юридически двусмыслен.</li>
        </ul>
      </Section>

      <Section title="Что мы не выдаём за безопасность">
        <p className="text-sm leading-relaxed text-[color:var(--ink-2)]">
          По ТЗ безопасность считается только по SourceCraft AppSec, и собственным сканированием мы её не
          подменяем. Две наши проверки показываются на странице анализа как справка и на балл не влияют:
          сверка версий из lock-файлов с открытой базой уязвимостей{' '}
          <a className="underline" href="https://osv.dev" target="_blank" rel="noreferrer noopener">
            OSV.dev
          </a>{' '}
          и поиск строк, похожих на ключи, в истории коммитов.
        </p>
      </Section>

      <Section title="Рекомендации">
        <p className="text-sm leading-relaxed text-[color:var(--ink-2)]">
          Для каждой слабой метрики движок считает, насколько вырастет итог, если подтянуть её до цели, и
          делит прирост на трудозатраты. Приросты считаются по очереди — с учётом уже применённых советов,
          — поэтому их сумма честно упирается в 100.
        </p>
      </Section>

      <Section title="Откуда данные">
        <ul className="grid gap-2 text-sm leading-relaxed text-[color:var(--ink-2)]">
          <li>
            <strong>REST API SourceCraft</strong> — карточка репозитория, задачи, pull request, релизы,
            теги; прогоны CI — только с токеном участника.
          </li>
          <li>
            <strong>Клон репозитория</strong> — история коммитов, авторы, файлы, исходники, конфиги CI.
            Клон удаляется сразу после анализа.
          </li>
          <li>
            <strong>SourceCraft AppSec</strong> — находки SAST, SCA и поиска секретов, только с токеном
            участника репозитория.
          </li>
          <li>
            <strong>Языковая модель</strong> — ревью выборки кода и рубрика README для публичных
            репозиториев. Код приватных репозиториев во внешнюю модель не уходит.
          </li>
        </ul>
        <p className="mt-6 text-sm">
          <Link href="/rating" className="underline">
            К рейтингу
          </Link>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
