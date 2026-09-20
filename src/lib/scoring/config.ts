// Все константы движка оценки в одном месте.
//
// Мотив: чтобы тюнить пороги можно было не читая метрики, а также чтобы
// тесты и рекомендательный движок опирались на одну «правду».
//
// Значения подобраны эмпирически, ориентируясь на распределение маленьких OSS
// репозиториев (по данным SourceCraft/GitHub): «здоровый» pet-проект на 1-2
// человека и «здоровый» командный проект. Все шкалы — линейные с отсечками,
// либо логарифмические. Комментарии рядом с каждым порогом объясняют выбор.

// ---------- Веса категорий (сумма = 1). Ровный вклад по ТЗ. ----------

export const CATEGORY_WEIGHTS = {
  activity: 0.25,
  code: 0.25,
  security: 0.25,
  docs: 0.25,
} as const;

// ---------- Пороги штрафов ----------
//
// Штрафы применяются поверх агрегированного балла, до clamp в 0..100.
// Составлены так, чтобы плохие практики били по совокупности, но не роняли
// хороший в остальном репозиторий в ноль.

export const PENALTIES = {
  /** Найден секрет в git-истории. */
  secretInHistory: 15,
  /** Есть хотя бы одна critical-уязвимость без исправлений. */
  criticalVulnUnfixed: 10,
  /** Нет LICENSE-файла. Открытый OSS без лицензии юридически двусмыслен. */
  missingLicense: 8,
} as const;

// ---------- Активность ----------

export const ACTIVITY_WEIGHTS = {
  commitsLast90Days: 0.35,
  activeAuthors: 0.2,
  freshness: 0.3, // насколько давно был последний коммит
  busFactor: 0.15, // доля кода топ-автора (bus factor)
};

/** Коммиты за 90 дней: log-шкала. 0 = 0 баллов, 50+ = 100. */
export const COMMITS_90D_TARGET = 50;

/**
 * Активные авторы за 90 дней: log-шкала. 1 → 30, 3 → 80, 5+ → 100.
 * Одиночный проект получает частичный балл — не пенализуем «pet-проекты».
 */
export const ACTIVE_AUTHORS_TARGET = 5;

/**
 * Свежесть: линейная от «сегодня» до «180 дней и старше».
 * 0 дней → 100, 30 дней → ~83, 90 дней → 50, 180+ → 0.
 */
export const FRESHNESS_MAX_STALE_DAYS = 180;

/**
 * Bus factor: доля кода топ-автора.
 * 0-30% → 100 (много рук), 100% → 30 (один автор всего кода).
 * Целевое значение — 30%.
 */
export const BUS_FACTOR_HEALTHY_SHARE = 30;
export const BUS_FACTOR_MIN_SCORE = 30;

// ---------- Код ----------

export const CODE_WEIGHTS = {
  prReviewShare: 0.35, // доля PR с ревью
  firstReviewMedianHours: 0.25, // медиана времени до первого ревью
  hasTests: 0.2,
  hasLinter: 0.2,
};

/** Доля PR с ревью: 0 → 0, 1.0 → 100 (линейно). */
export const PR_REVIEW_SHARE_TARGET = 1.0;

/**
 * Медиана времени до первого ревью, часы.
 * ≤24ч → 100, 168ч (7 дней) → 50, 720ч (30 дней) → 0.
 * Линейная шкала с обратной инверсией.
 */
export const REVIEW_MEDIAN_HOURS_BEST = 24;
export const REVIEW_MEDIAN_HOURS_WORST = 720;

// ---------- Безопасность ----------

export const SECURITY_WEIGHTS = {
  criticalVulns: 0.3, // отсутствие критических CVE
  highVulns: 0.2, // отсутствие high CVE
  lockfilesPresent: 0.2, // зафиксированные версии зависимостей
  securityMd: 0.15, // наличие SECURITY.md
  freshDependencies: 0.15, // MVP: если lock есть — 100, нет — unknown
};

/**
 * Пороги «плохих» CVE. Score метрики = линейно от 0 CVE = 100 до N+ CVE = 0.
 * Для critical хватит одной — жёстче.
 */
export const CRITICAL_VULNS_MAX = 3;
export const HIGH_VULNS_MAX = 10;

// ---------- Документация ----------

export const DOCS_WEIGHTS = {
  readme: 0.4,
  license: 0.2,
  contributing: 0.15,
  changelog: 0.1,
  usageExamples: 0.15,
};

/**
 * README: балл 0..100 на основе heuristics — длина текста и число заголовков.
 * 400+ символов → 40 баллов, 3+ h1/h2 секций → +40, наличие блока usage/example → +20.
 * Итоговый score = сумма, зажатая в 0..100.
 */
export const README_MIN_CHARS = 400;
export const README_TARGET_SECTIONS = 3;

// ---------- Рекомендации: оценка трудозатрат ----------
//
// Единицы условные. При сортировке gain/effort меньшее effort = приоритетнее.

export const EFFORT = {
  trivial: 1, // добавить LICENSE, SECURITY.md
  small: 3, // добавить CHANGELOG, docs-разделы, включить линтер
  medium: 8, // добавить тесты, настроить CI
  large: 20, // рефакторинг ради снижения bus factor, глубокая переработка PR-процесса
} as const;

export type Effort = keyof typeof EFFORT;
