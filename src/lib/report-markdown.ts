// Отчёт об анализе в Markdown: то же, что на странице анализа, одним файлом —
// чтобы приложить к задаче, отправить команде или положить рядом с кодом.
//
// Только публичная часть оценки: личные данные владельца (AppSec публичного
// репозитория, прогоны CI) в файл не попадают — файл легко переслать дальше.

import { CATEGORY_ORDER, CATEGORY_TITLES, categoryOrder, categoryWeightPercent } from './category-meta';
import { metricLabel } from './metric-labels';
import { describeMissingList } from './missing-labels';
import { computeCoverage } from './scoring/coverage';
import { PRIORITY_LABELS, RECOMMENDATION_WHY, recommendationPriority, strengthsAndWeaknesses } from './scoring/insights';
import type { AppliedPenalty, CategoryKey, CategoryScore, MetricScore, Recommendation } from './scoring/types';
import { APP_TIME_ZONE } from './time';
import type { ExtraAnalytics } from './extra-analytics';

export type ReportInput = {
  org: string;
  repo: string;
  webUrl: string | null;
  language: string | null;
  score: number | null;
  kind: string;
  finishedAt: Date | null;
  categoryScores: unknown;
  recommendations: unknown;
  missing: unknown;
  penalties: unknown;
  /** Абсолютный адрес страницы анализа — ссылка «открыть в Pulse». */
  pageUrl: string;
  methodologyUrl: string;
  /** CODEOWNERS, пустые коммиты, ревью PR — вне балла. */
  extras?: ExtraAnalytics;
};

const EFFORT_LABELS: Record<string, string> = {
  trivial: 'минуты',
  small: 'час',
  medium: 'день',
  large: 'неделя и больше',
};

export function buildReportMarkdown(input: ReportInput): string {
  const slug = `${input.org}/${input.repo}`;
  const categories = (Array.isArray(input.categoryScores) ? input.categoryScores : []) as CategoryScore[];
  const sorted = [...categories].sort((a, b) => categoryOrder(a.key) - categoryOrder(b.key));
  const recommendations = (Array.isArray(input.recommendations) ? input.recommendations : []) as Recommendation[];
  const penalties = (Array.isArray(input.penalties) ? input.penalties : []) as AppliedPenalty[];
  const missing = describeMissingList(
    (Array.isArray(input.missing) ? input.missing : []).filter((m): m is string => typeof m === 'string'),
  );
  const coverage = computeCoverage(input.categoryScores);
  const lines: string[] = [];

  lines.push(`# Repo Health Score: ${slug}`, '');
  if (input.kind === 'material') {
    lines.push('**Полезный материал** — подборка или конспект, а не программа: инженерная оценка к нему неприменима.', '');
  } else {
    lines.push(`**Итоговая оценка: ${input.score ?? '—'} / 100**`, '');
  }
  const meta = [
    input.webUrl ? `Репозиторий: ${input.webUrl}` : null,
    input.language ? `Язык: ${input.language}` : null,
    input.finishedAt ? `Дата анализа: ${input.finishedAt.toLocaleDateString('en-CA', { timeZone: APP_TIME_ZONE })}` : null,
    coverage !== null ? `Покрытие данных: ${Math.round(coverage * 100)}%` : null,
  ].filter(Boolean);
  for (const item of meta) lines.push(`- ${item}`);
  lines.push(`- Отчёт на сайте: ${input.pageUrl}`, `- Методика расчёта: ${input.methodologyUrl}`, '');

  if (input.kind !== 'material' && sorted.length > 0) {
    lines.push('## Категории', '', '| Категория | Вес | Балл |', '|---|---:|---:|');
    for (const c of sorted) {
      const known = c.key in CATEGORY_TITLES;
      const weight = known ? `${categoryWeightPercent(c.key as CategoryKey)}%` : '—';
      lines.push(`| ${CATEGORY_TITLES[c.key] ?? c.key} | ${weight} | ${formatValue(c.value, 'нет данных')} |`);
    }
    lines.push(
      '',
      'Категории без данных не штрафуют: они исключаются из расчёта, а их вес делится между измеренными.',
      '',
    );

    const { strengths, weaknesses } = strengthsAndWeaknesses(sorted);
    if (strengths.length > 0 || weaknesses.length > 0) {
      lines.push('## Сильные и слабые стороны', '');
      for (const [title, list] of [
        ['Сильные стороны', strengths],
        ['Слабые стороны', weaknesses],
      ] as const) {
        if (list.length === 0) continue;
        lines.push(`**${title}**`, '');
        for (const s of list) {
          lines.push(`- ${metricLabel(s.key)} (${CATEGORY_TITLES[s.category] ?? s.category}) — ${s.value}${s.hint ? `: ${s.hint}` : ''}`);
        }
        lines.push('');
      }
    }

    lines.push('## Метрики', '');
    for (const c of sorted) {
      lines.push(`### ${CATEGORY_TITLES[c.key] ?? c.key} — ${formatValue(c.value, 'нет данных')}`, '');
      for (const m of c.metrics as MetricScore[]) {
        const value = m.unknown ? 'н/д' : String(Math.round(m.value));
        lines.push(`- **${metricLabel(m.key)}**: ${value}${m.hint ? ` — ${m.hint}` : ''}`);
      }
      lines.push('');
    }

    if (penalties.length > 0) {
      lines.push('## Штрафы', '');
      for (const p of penalties) lines.push(`- −${p.amount}: ${p.reason}`);
      lines.push('');
    }

    lines.push('## Рекомендации', '');
    if (recommendations.length === 0) {
      lines.push('Слабых мест, которые стоит подтянуть в первую очередь, не нашлось.', '');
    } else {
      lines.push(
        '| # | Что сделать | Приоритет | Категория | Трудозатраты | Прирост |',
        '|---:|---|---|---|---|---:|',
      );
      recommendations.forEach((r, i) => {
        lines.push(
          `| ${i + 1} | ${escapeCell(r.title)} | ${PRIORITY_LABELS[recommendationPriority(r)]} | ${
            CATEGORY_TITLES[r.category] ?? r.category
          } | ${EFFORT_LABELS[r.effort] ?? r.effort} | +${r.gain.toFixed(1)} |`,
        );
      });
      lines.push('', 'Порядок — по приросту балла на единицу усилий.', '');
      recommendations.forEach((r, i) => {
        const why = RECOMMENDATION_WHY[r.category] as string | undefined;
        lines.push(
          `**${i + 1}. ${r.title}.**${why ? ` Почему важно: ${why}` : ''}${r.now ? ` Сейчас: ${r.now}.` : ''}${
            r.how ? ` Что сделать: ${r.how}` : ''
          }`,
          '',
        );
      });
    }
  }

  if (input.extras && input.kind !== 'material') {
    lines.push(...extraAnalyticsLines(input.extras));
  }

  if (missing.length > 0) {
    lines.push('## Что не удалось собрать', '');
    for (const note of missing) lines.push(`- ${note.text}${note.detail ? ` (${note.detail})` : ''}`);
    lines.push('');
  }

  lines.push('---', '', `Сформировано Pulse. Шкала 0–100, категории: ${CATEGORY_ORDER.map((k) => CATEGORY_TITLES[k]).join(', ')}.`, '');
  return lines.join('\n');
}

function formatValue(value: number | null | undefined, empty: string): string {
  return typeof value === 'number' ? String(Math.round(value)) : empty;
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/** Раздел «Дополнительная аналитика»: те же три показателя, что на странице. */
export function extraAnalyticsLines(extras: ExtraAnalytics): string[] {
  const lines = ['## Дополнительная аналитика', '', 'Показатели сопровождения проекта. В Repo Health Score не входят.', ''];
  const co = extras.codeowners;
  lines.push(
    `- **CODEOWNERS:** ${
      co.status === 'present' ? `есть (${co.path})` : co.status === 'absent' ? 'нет' : 'нет данных'
    }`,
  );
  const ec = extras.emptyCommits;
  lines.push(
    `- **Пустые коммиты за 90 дней:** ${
      ec.status === 'known'
        ? `${ec.empty} из ${ec.total}${ec.empty > 0 ? ' (не учтены в метрике коммитов)' : ''}`
        : ec.reason === 'old_analysis'
          ? 'нет данных (анализ выполнен до появления проверки)'
          : 'нет данных'
    }`,
  );
  const r = extras.reviews;
  if (!r || !r.available) {
    lines.push('- **Ревью pull request:** нет данных');
  } else if (r.sampledPrs === 0) {
    lines.push('- **Ревью pull request:** pull request не используются');
  } else {
    lines.push(
      `- **Ревью pull request:** комментарии не автора в ${r.reviewedPrs} из ${r.sampledPrs} последних PR`,
      `  - комментариев ревьюеров: ${r.reviewComments}; медиана на PR с ревью: ${r.medianCommentsPerReviewedPr ?? '—'}`,
      `  - медиана до первого ревью: ${r.medianFirstReviewHours === null ? '—' : `${r.medianFirstReviewHours} ч`}`,
      `  - открытых PR без ревью дольше 7 дней: ${r.waitingPrs}`,
      `  - замечаний к уже изменённому коду: ${r.outdatedSharePercent === null ? '—' : `${r.outdatedSharePercent}%`}`,
      `  - комментариев SourceCraft AppSec: ${r.appsecComments}`,
    );
    if (r.topReviewers.length > 0) {
      lines.push(`  - основные ревьюеры: ${r.topReviewers.map((t) => `${t.slug} (${t.comments})`).join(', ')}`);
    }
  }
  lines.push('');
  return lines;
}
