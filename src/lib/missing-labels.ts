// Человеческие формулировки для ключей из `missing`.
//
// В `missing` копятся технические строки вида `tree_fetch_failed:timeout`
// или `deps_lockfile_unsupported:Cargo.lock`. На странице анализа список из
// таких ключей читать невозможно, поэтому переводим их в понятные фразы,
// а исходный ключ оставляем рядом мелким шрифтом.

export type MissingNote = {
  /** Что произошло, по-русски. */
  text: string;
  /** Уточнение из части ключа после двоеточия, если она есть. */
  detail?: string;
  /** Исходный ключ — для отладки и багрепортов. */
  raw: string;
};

const EXACT: Record<string, string> = {
  repository_not_found_or_forbidden: 'Репозиторий не найден или закрыт для нашего токена',
  repository_fetch_failed: 'Карточка репозитория не пришла из API',
  contributors_fetch_failed: 'Список участников не пришёл из API',
  tree_fetch_failed: 'Дерево файлов не пришло из API',
  branches_fetch_failed: 'Список ветвей не пришёл из API',
  tags_fetch_failed: 'Список тегов не пришёл из API',
  releases_fetch_failed: 'Список релизов не пришёл из API',
  latest_release_fetch_failed: 'Последний релиз не пришёл из API',
  pull_requests_fetch_failed: 'Выборка pull request не пришла из API',
  issues_fetch_failed: 'Выборка issue не пришла из API',
  readme_missing: 'В репозитории нет README',
  license_missing: 'В репозитории нет LICENSE',
  clone_url_missing: 'API не дал адрес для клонирования',
  git_clone_failed: 'Не удалось прочитать репозиторий git-клоном',
  language_unknown: 'Язык не определён ни по API, ни по составу файлов',
  clone_unavailable: 'Клон репозитория не делали — оценивать код было не по чему',
  clone_tip_only: 'Репозиторий большой: скачали только последний снимок файлов, без истории',
  code_files_not_found: 'Файлов с кодом на понятных нам языках не нашлось',
  code_files_unreadable: 'Файлы с кодом не удалось прочитать из клона',
  no_supported_lockfile_found: 'Нет lock-файла, который мы умеем разбирать',
  deps_lockfile_unsupported: 'Для этого lock-файла у нас нет разбора',
  sourcecraft_appsec_not_public: 'Данных AppSec SourceCraft нет в публичном API',
  lockfile_parse_error: 'Lock-файл не разобрался',
  security_scan_error: 'Сканирование уязвимостей не отработало',
  secrets_scan_failed: 'Поиск секретов не отработал',
  git_history_failed: 'История коммитов не прочиталась',
  history_unavailable: 'Историю не качали: репозиторий большой, взяли только снимок файлов',
  git_graph_failed: 'Дерево коммитов не построилось',
  git_graph_empty: 'В клоне не оказалось ни одного коммита',
  repository_api_error: 'API репозитория вернул ошибку',
  collect_timeout: 'Сбор данных не успел за отведённое время',
};

/** Разбирает ключ вида `prefix:detail` в понятную заметку. */
export function describeMissing(raw: string): MissingNote {
  const colon = raw.indexOf(':');
  const key = colon < 0 ? raw : raw.slice(0, colon);
  const detail = colon < 0 ? undefined : raw.slice(colon + 1).trim() || undefined;

  const text = EXACT[key];
  if (text) return { text, detail, raw };

  // Незнакомый ключ: не выдумываем перевод, показываем как есть.
  return { text: 'Не удалось собрать данные', detail: raw, raw };
}

/**
 * Ключи, которые не стоит показывать в «что не удалось собрать».
 *
 * `no_supported_lockfile_found` — не сбой, а обычное состояние: разбирать мы
 * умеем package-lock.json и pnpm-lock.yaml, а у Go, Rust, Python и половины
 * остального мира их нет и быть не должно. В списке пробелов эта строка
 * появлялась почти всегда и только мешала читать настоящие пробелы; сам факт
 * отсутствия lock-файлов виден в метрике «Lock-файлы» категории
 * «Безопасность».
 */
const HIDDEN_FROM_GAPS = new Set(['no_supported_lockfile_found']);

export function describeMissingList(items: string[]): MissingNote[] {
  return items
    .filter((raw) => !HIDDEN_FROM_GAPS.has(raw.split(':', 1)[0] ?? raw))
    .map(describeMissing);
}
