// Фазы анализа: одни и те же ключи пишет сервер и читает страница.
//
// Прогресс здесь настоящий, а не декоративный: сборщик фактов сообщает, что
// он делает прямо сейчас, и фаза уходит в колонку `analyses.stage`. Поэтому
// после обновления страницы видно ровно то же место, а не «начинаем сначала».

export const ANALYSIS_STAGES = [
  { key: 'queued', label: 'Встали в очередь' },
  { key: 'api', label: 'Опрашиваем API SourceCraft' },
  { key: 'clone', label: 'Клонируем репозиторий' },
  { key: 'index', label: 'Строим карту файлов' },
  { key: 'read', label: 'Читаем исходники' },
  { key: 'history', label: 'Разбираем историю коммитов' },
  { key: 'security', label: 'Проверяем зависимости' },
  { key: 'ai', label: 'Модель читает код' },
  { key: 'score', label: 'Считаем оценку' },
] as const;

export type AnalysisStageKey = (typeof ANALYSIS_STAGES)[number]['key'];

/** Порядковый номер фазы. -1 — ключ незнакомый (старая запись, новая фаза). */
export function stageIndex(key: string | null | undefined): number {
  if (!key) return -1;
  return ANALYSIS_STAGES.findIndex((stage) => stage.key === key);
}

export function stageLabel(key: string | null | undefined): string | null {
  const index = stageIndex(key);
  return index < 0 ? null : ANALYSIS_STAGES[index]!.label;
}
