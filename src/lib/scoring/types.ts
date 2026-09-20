// Типы, общие для scoring-модулей.

import type { Effort } from './config';

/** Категория верхнего уровня. */
export type CategoryKey = 'activity' | 'code' | 'security' | 'docs';

/** Ключ метрики (уникальный в рамках всей системы, не только категории). */
export type MetricKey = string;

/**
 * Балл одной метрики.
 * `unknown: true` означает, что данных нет — метрика исключается из расчёта
 * категории, а веса остальных нормируются заново.
 */
export type MetricScore =
  | {
      key: MetricKey;
      category: CategoryKey;
      weight: number; // изначальный вес внутри категории
      value: number; // 0..100
      unknown?: false;
      /** Короткая подпись, что означает балл (по-русски, для UI). */
      hint?: string;
      /** Порог, ниже которого метрика попадает в кандидаты в рекомендации. */
      target?: number;
      /** Оценка усилий по подтягиванию до target. */
      effort?: Effort;
      /** Тип рекомендации (для человекочитаемого текста в UI/AI). */
      recommendationKind?: string;
    }
  | {
      key: MetricKey;
      category: CategoryKey;
      weight: number;
      value: null;
      unknown: true;
      hint?: string;
    };

/** Балл категории — среднее взвешенное известных метрик. */
export type CategoryScore = {
  key: CategoryKey;
  value: number | null; // null, если все метрики unknown
  appliedWeightSum: number; // сумма весов известных метрик до нормировки
  metrics: MetricScore[];
};

/** Одна рекомендация. */
export type Recommendation = {
  key: MetricKey;
  category: CategoryKey;
  title: string; // «Добавьте LICENSE», «Заведите CI»
  effort: Effort;
  /** Прирост к overall score, если подтянуть эту метрику до target. */
  gain: number;
  gainPerEffort: number;
};

/** Применённый штраф. */
export type AppliedPenalty = {
  key: 'secret_in_history' | 'critical_vuln_unfixed' | 'missing_license';
  amount: number; // положительное число; вычитается из overall
  reason: string;
};

/** Итоговый результат оценки. */
export type AnalysisResult = {
  score: number; // 0..100
  scoreBeforePenalties: number; // до штрафов, тоже 0..100
  categoryScores: CategoryScore[];
  penalties: AppliedPenalty[];
  recommendations: Recommendation[];
  /** Список полей, для которых не удалось собрать данные (проксируем из RepoFacts + добавляем свои). */
  missing: string[];
};
