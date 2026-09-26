// «Как сделать» для рекомендации: конкретные шаги под стек репозитория.
//
// Заголовок говорит, что подтянуть («Добавьте автотесты»), а этот текст — как:
// каким инструментом, в каком файле, до какой цели. Стек определяем по
// манифестам в дереве и основному языку — теми же признаками, что и сбор.

import type { RepoFacts } from '../collect';
import {
  CLOSED_ISSUES_SHARE_TARGET,
  COMMENT_SHARE_TARGET,
  ISSUE_REACTION_DAYS_BEST,
  LONG_FILE_SHARE_BEST,
  STALE_ISSUE_DAYS,
  TESTS_PER_100_FILES_TARGET,
  TODO_PER_KLOC_BEST,
} from './config';

type Stack = 'node' | 'python' | 'go' | 'rust' | 'java' | 'other';

export function detectStack(facts: RepoFacts): Stack {
  const names = new Set(
    facts.tree.entries.map((e) => (e.path ?? '').toLowerCase()).filter((p) => !p.includes('/')),
  );
  if (names.has('package.json')) return 'node';
  if (names.has('pyproject.toml') || names.has('requirements.txt') || names.has('setup.py')) return 'python';
  if (names.has('go.mod')) return 'go';
  if (names.has('cargo.toml')) return 'rust';
  if (names.has('pom.xml') || names.has('build.gradle') || names.has('build.gradle.kts')) return 'java';
  const lang = (facts.language ?? '').toLowerCase();
  if (['typescript', 'javascript', 'tsx', 'vue', 'svelte'].includes(lang)) return 'node';
  if (lang === 'python') return 'python';
  if (lang === 'go') return 'go';
  if (lang === 'rust') return 'rust';
  if (['java', 'kotlin'].includes(lang)) return 'java';
  return 'other';
}

const TEST_TOOL: Record<Stack, string> = {
  node: 'Vitest или Jest (файлы *.test.ts рядом с кодом, скрипт "test" в package.json)',
  python: 'pytest (каталог tests/, файлы test_*.py)',
  go: 'go test (файлы *_test.go рядом с кодом)',
  rust: 'cargo test (модули #[cfg(test)] и каталог tests/)',
  java: 'JUnit 5 (src/test/java)',
  other: 'тестовый фреймворк вашего стека',
};

const LINTER: Record<Stack, string> = {
  node: 'ESLint (eslint.config.js) или Biome (biome.json) и скрипт "lint" в package.json',
  python: 'Ruff: секция [tool.ruff] в pyproject.toml, запуск ruff check .',
  go: 'golangci-lint с файлом .golangci.yml',
  rust: 'cargo clippy с -D warnings, настройки в clippy.toml',
  java: 'Checkstyle или Spotless в сборке',
  other: 'линтер вашего стека с конфигом в корне',
};

const CI_COMMANDS: Record<Stack, string> = {
  node: 'npm ci, npm run lint, npm test',
  python: 'pip install -r requirements.txt, ruff check ., pytest',
  go: 'go vet ./..., go test ./...',
  rust: 'cargo clippy, cargo test',
  java: './gradlew check или mvn verify',
  other: 'сборку и тесты',
};

export function howTo(kind: string, facts: RepoFacts): string | undefined {
  const stack = detectStack(facts);
  switch (kind) {
    // ---------- Код ----------
    case 'add_tests':
      return `Подключите ${TEST_TOOL[stack]}. Начните с функций, которые считают или преобразуют данные: у них понятные входы и выходы. Цель — ${TESTS_PER_100_FILES_TARGET} тестовых файлов на 100 файлов кода.`;
    case 'add_linter':
      return `Настройте ${LINTER[stack]}. Сначала включите рекомендуемый набор правил и исправьте найденное, потом добавьте запуск в CI.`;
    case 'split_long_files':
      return `Разбейте файлы длиннее 500 строк по ответственности: отдельно ввод-вывод, вычисления, типы. Цель — не больше ${LONG_FILE_SHARE_BEST}% таких файлов.`;
    case 'explain_code':
      return `Поясните не «что», а «почему»: неочевидные решения, обходы ограничений, формат данных. Около ${COMMENT_SHARE_TARGET}% строк-пояснений — хороший ориентир.`;
    case 'close_todo':
      return `Пройдите по TODO/FIXME: сделайте, заведите задачу в трекере или удалите устаревшие. Цель — не больше ${TODO_PER_KLOC_BEST} пометки на 1000 строк.`;
    case 'add_build_manifest':
      return 'Опишите зависимости и команды сборки в манифесте стека (package.json, pyproject.toml, go.mod, Cargo.toml): без него проект не собрать с нуля.';
    case 'add_gitignore':
      return 'Добавьте .gitignore под стек: каталоги сборки, зависимости, .env, файлы редакторов. Проверьте, что уже закоммиченный мусор удалён из индекса (git rm --cached).';
    case 'add_editorconfig':
      return 'Положите .editorconfig в корень: кодировка utf-8, перевод строки lf, отступы как в проекте.';
    case 'add_lockfile':
      return stack === 'node'
        ? 'Закоммитьте package-lock.json (или pnpm-lock.yaml) и ставьте зависимости через npm ci.'
        : stack === 'python'
          ? 'Зафиксируйте версии: poetry.lock, uv.lock или requirements.txt с точными версиями (pip freeze).'
          : 'Закоммитьте lock-файл пакетного менеджера — так у всех и в CI одни и те же версии.';
    case 'add_dependency_bot':
      return 'Включите автообновление зависимостей (Renovate или Dependabot, если он доступен), чтобы исправления уязвимостей приходили сами pull request.';

    // ---------- Безопасность (AppSec) ----------
    case 'fix_critical_vulns':
    case 'fix_high_vulns':
    case 'fix_medium_vulns':
      return 'Откройте находки в разделе безопасности репозитория на SourceCraft: для зависимостей обновите пакет до исправленной версии, для кода исправьте место из отчёта. Ложные срабатывания отметьте там же — они перестанут учитываться.';
    case 'remove_secrets':
      return 'Сначала отзовите ключ в сервисе, которому он принадлежит, — он уже в истории. Затем уберите его из кода, читайте из переменной окружения и добавьте .env в .gitignore.';

    // ---------- CI/CD ----------
    case 'add_ci':
      return `Создайте .sourcecraft/ci.yaml: запуск на push и pull_request, шаги — ${CI_COMMANDS[stack]}. Pulse может подготовить этот файл в pull request.`;
    case 'ci_run_tests':
      return `Добавьте в пайплайн шаг с тестами: ${CI_COMMANDS[stack]}.`;
    case 'ci_run_lint':
      return 'Добавьте в пайплайн шаг линтера перед тестами: тогда стиль и простые ошибки ловятся до ревью.';
    case 'ci_check_prs':
      return 'Добавьте в .sourcecraft/ci.yaml триггер pull_request — проверки будут идти до слияния, а не после.';
    case 'fix_ci_runs':
      return 'Откройте последние упавшие прогоны CI и почините причину. Нестабильные тесты лучше исправить или временно выключить, чем перезапускать.';

    // ---------- Активность ----------
    case 'increase_commit_frequency':
      return 'Коммитьте чаще и мельче: одна законченная правка — один коммит. Это и ритм проекта, и удобное ревью.';
    case 'grow_team':
      return 'Заведите задачи с меткой для новичков и опишите в CONTRIBUTING, как начать: так проще привлечь соавторов.';
    case 'commit_recently':
      return 'Проект давно не обновлялся. Если он жив — обновите зависимости и выпустите версию; если нет — отметьте это в README.';
    case 'reduce_bus_factor':
      return 'Большую часть кода пишет один человек. Проводите изменения через ревью второго участника и документируйте устройство проекта.';
    case 'cut_release':
      return 'Поставьте тег версии (например, v1.0.0) и опубликуйте релиз с описанием изменений — и заведите CHANGELOG.';
    case 'use_pull_requests':
      return 'Вносите изменения через pull request даже в одиночку: история решений и место для проверок CI.';

    // ---------- Задачи ----------
    case 'close_issues':
      return `Разберите трекер: закройте сделанное и неактуальное, остальное разбейте на выполнимые задачи. Цель — закрыто не меньше ${CLOSED_ISSUES_SHARE_TARGET}%.`;
    case 'triage_stale_issues':
      return `Задачи без движения дольше ${STALE_ISSUE_DAYS} дней: закройте неактуальные, остальным назначьте исполнителя или приоритет.`;
    case 'react_to_issues':
      return `Берите новую задачу в работу или отвечайте на неё в течение ${ISSUE_REACTION_DAYS_BEST} дней — даже коротким «посмотрим».`;

    // ---------- Документация ----------
    case 'add_readme':
    case 'expand_readme':
      return 'В README нужны: что это и зачем, установка, запуск с примером, конфигурация, как помочь проекту, лицензия. Pulse может подготовить README в pull request.';
    case 'add_license':
      return 'Добавьте файл LICENSE (MIT, Apache-2.0 или другую) — без него код формально нельзя использовать.';
    case 'add_contributing':
      return 'Опишите в CONTRIBUTING.md: как запустить проект локально, стиль кода, как оформлять pull request.';
    case 'add_changelog':
      return 'Ведите CHANGELOG.md в формате Keep a Changelog: раздел на каждую версию — добавлено, изменено, исправлено.';
    case 'add_usage_examples':
      return 'Покажите работающий пример: блок кода в README или каталог examples/ с минимальным запуском.';
    case 'add_docs_dir':
      return 'Вынесите подробности из README в docs/: архитектура, конфигурация, API.';
    case 'add_code_of_conduct':
      return 'Добавьте CODE_OF_CONDUCT.md (например, Contributor Covenant) — правила общения для участников.';
    case 'add_issue_template':
      return 'Заведите шаблоны задач: для ошибки (шаги, ожидаемое, фактическое) и для предложения.';
    case 'add_repo_description':
      return 'Заполните описание репозитория в его настройках на SourceCraft: одна фраза о том, что делает проект.';
    default:
      return undefined;
  }
}
