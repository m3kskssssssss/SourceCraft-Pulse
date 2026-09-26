// Человеческие названия метрик — для страницы анализа, выгрузки отчёта и
// страницы методики. Старые ключи оставлены: прошлые прогоны хранятся в базе
// с ними и должны читаться так же, как раньше.

export const METRIC_LABELS: Record<string, string> = {
  // Безопасность — только SourceCraft AppSec
  'security.critical_vulns': 'Critical-находки AppSec',
  'security.high_vulns': 'High-находки AppSec',
  'security.medium_vulns': 'Medium-находки AppSec',
  'security.secrets': 'Секреты в репозитории (AppSec)',
  // Код
  'code.tests': 'Автотесты',
  'code.file_size': 'Размер файлов',
  'code.comments': 'Пояснения в коде',
  'code.todo_debt': 'Незакрытые TODO',
  'code.has_linter': 'Линтер',
  'code.build_manifest': 'Манифест сборки',
  'code.gitignore': '.gitignore',
  'code.editorconfig': '.editorconfig',
  'code.lockfile': 'Lock-файл зависимостей',
  'code.dependency_bot': 'Автообновление зависимостей',
  'code.ai_review': 'Ревью кода моделью',
  // Активность
  'activity.commits_90d': 'Коммитов за 90 дней',
  'activity.active_authors': 'Активных авторов',
  'activity.freshness': 'Свежесть последнего коммита',
  'activity.bus_factor': 'Bus factor',
  'activity.releases': 'Релизы и теги',
  'activity.pr_flow': 'Поток pull request',
  // Документация
  'docs.readme': 'README',
  'docs.license': 'LICENSE',
  'docs.contributing': 'CONTRIBUTING',
  'docs.changelog': 'CHANGELOG',
  'docs.usage_examples': 'Примеры использования',
  'docs.docs_dir': 'Каталог документации',
  'docs.code_of_conduct': 'CODE_OF_CONDUCT',
  'docs.issue_template': 'Шаблоны задач и PR',
  'docs.repo_description': 'Описание репозитория',
  'docs.ai_rubric': 'Документация по рубрике модели',
  // CI/CD
  'ci.config': 'Конфиг CI',
  'ci.runs_tests': 'Тесты в пайплайне',
  'ci.runs_lint': 'Линтер в пайплайне',
  'ci.pr_checks': 'Проверка pull request',
  'ci.runs_success': 'Успешные прогоны CI',
  // Задачи
  'issues.closed_share': 'Закрытие задач',
  'issues.stale_share': 'Заброшенные задачи',
  'issues.reaction_time': 'Скорость реакции на задачи',
  // Ключи прошлых версий методики
  'code.has_ci': 'Непрерывная интеграция',
  'activity.issue_flow': 'Закрытие задач',
  'security.lockfiles_present': 'Lock-файлы',
  'security.dependency_bot': 'Автообновление зависимостей',
  'security.fresh_dependencies': 'Свежесть зависимостей',
};

export function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key;
}
