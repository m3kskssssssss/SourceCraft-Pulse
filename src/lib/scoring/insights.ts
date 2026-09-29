// Выводы поверх посчитанной оценки: приоритет рекомендации, почему она
// важна, сильные и слабые стороны. Ничего не пересчитывают — только читают
// баллы метрик и приросты, поэтому одинаково работают на странице анализа,
// в Markdown-отчёте и в публичном API (ТЗ, разделы 3.3 и 3.4).

import { CATEGORY_WEIGHTS } from './config';
import type { CategoryKey, CategoryScore, MetricScore, Recommendation } from './types';

export type Priority = 'high' | 'medium' | 'low';

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Высокий приоритет',
  medium: 'Средний приоритет',
  low: 'Низкий приоритет',
};

/** Приросты, начиная с которых шаг считается высоким и средним приоритетом. */
const HIGH_GAIN = 5;
const MEDIUM_GAIN = 2;

/**
 * Приоритет по ожидаемому приросту балла. Находки AppSec — всегда высокий:
 * это прямой риск, а не гигиена, даже если в балле он весит немного.
 */
export function recommendationPriority(r: Pick<Recommendation, 'gain' | 'category'>): Priority {
  if (r.category === 'security') return 'high';
  if (r.gain >= HIGH_GAIN) return 'high';
  if (r.gain >= MEDIUM_GAIN) return 'medium';
  return 'low';
}

/** Почему шаг важен — по категории, к которой он относится. */
export const RECOMMENDATION_WHY: Record<CategoryKey, string> = {
  security:
    'Открытые находки AppSec — прямой риск: уязвимую зависимость или утёкший ключ находят и используют чужие люди.',
  code: 'Код без тестов, линтера и зафиксированных зависимостей дорого менять: ошибки находят пользователи, а не проверки.',
  activity:
    'По активности решают, живой ли проект: заброшенную зависимость никто не обновит, когда в ней найдут ошибку.',
  docs: 'Без документации проект не запустить и не проверить: новый участник и пользователь уходят раньше, чем разберутся.',
  ci: 'Без автоматических проверок сломанная сборка и упавшие тесты попадают в основную ветку незамеченными.',
  issues: 'Задачи без ответа и движения говорят пользователям, что об ошибках сообщать бесполезно.',
};

type KnownMetric = Extract<MetricScore, { value: number }>;

export type Insight = {
  key: string;
  category: CategoryKey;
  value: number;
  hint: string | null;
};

/** Сколько пунктов показываем в каждой колонке. */
const INSIGHTS_LIMIT = 4;
const STRENGTH_MIN = 85;
const WEAKNESS_MAX = 50;

/**
 * Сильные стороны — измеренные метрики с высоким баллом, слабые — с низким.
 * Порядок — по вкладу в итог: вес категории × вес метрики, для слабых ещё и
 * на недобор до 100. Так наверх идёт то, что действительно двигает оценку.
 */
export function strengthsAndWeaknesses(categories: CategoryScore[]): {
  strengths: Insight[];
  weaknesses: Insight[];
} {
  const known: KnownMetric[] = [];
  for (const c of categories) {
    // Категория целиком без данных — это не слабость, а «нет данных».
    if (c.value === null || !Array.isArray(c.metrics)) continue;
    for (const m of c.metrics) if (!m.unknown && typeof m.value === 'number') known.push(m as KnownMetric);
  }
  const impact = (m: KnownMetric): number => CATEGORY_WEIGHTS[m.category] * m.weight;
  const toInsight = (m: KnownMetric): Insight => ({
    key: m.key,
    category: m.category,
    value: Math.round(m.value),
    hint: m.hint ?? null,
  });

  const strengths = known
    .filter((m) => m.value >= STRENGTH_MIN)
    .sort((a, b) => impact(b) * b.value - impact(a) * a.value)
    .slice(0, INSIGHTS_LIMIT)
    .map(toInsight);
  const weaknesses = known
    .filter((m) => m.value < WEAKNESS_MAX)
    .sort((a, b) => impact(b) * (100 - b.value) - impact(a) * (100 - a.value))
    .slice(0, INSIGHTS_LIMIT)
    .map(toInsight);
  return { strengths, weaknesses };
}
