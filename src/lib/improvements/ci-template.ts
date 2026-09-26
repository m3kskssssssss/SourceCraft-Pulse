// Шаблон CI SourceCraft (.sourcecraft/ci.yaml) для pull request.
//
// Формат — как у работающих конфигов на платформе: триггеры push в основную
// ветку и pull_request в неё, один workflow, одна задача, один куб со
// скриптом. Команды берём только те, что в проекте уже есть: скрипты из
// package.json, pytest при наличии тестов, ruff при его упоминании в
// pyproject.toml, gradlew или mvn. Команд, которых проект не знает, не
// выдумываем: конфиг, который падает на первом шаге, хуже, чем никакого.
//
// Чистая функция без сети и диска — ради Vitest-теста.

export type CiTemplateInput = {
  /** Все пути репозитория. */
  paths: string[];
  defaultBranch: string;
  /** Тексты манифестов, если есть. */
  packageJson: string | null;
  pyproject: string | null;
};

export type CiTemplate = {
  path: '.sourcecraft/ci.yaml';
  content: string;
  /** Стек словами — для заголовка пункта. */
  label: string;
  runsTests: boolean;
  runsLint: boolean;
};

type Plan = { label: string; image: string; script: string[]; runsTests: boolean; runsLint: boolean };

export function buildCiTemplate(input: CiTemplateInput): CiTemplate | null {
  const plan = planFor(input);
  if (!plan) return null;
  const branch = JSON.stringify(input.defaultBranch);
  const content = [
    '# CI SourceCraft: проверки на каждый push в основную ветку и на pull request в неё.',
    '# Справочник: https://sourcecraft.dev/portal/docs/ru/sourcecraft/ci-cd-ref/',
    'on:',
    '  push:',
    '    - workflows: [check]',
    '      filter:',
    `        branches: [${branch}]`,
    '  pull_request:',
    '    - workflows: [check]',
    '      filter:',
    `        target_branches: [${branch}]`,
    '',
    'workflows:',
    '  check:',
    '    tasks:',
    '      - name: check',
    '        cubes:',
    '          - name: check',
    `            image: ${plan.image}`,
    '            script:',
    ...plan.script.map((line) => `              - ${JSON.stringify(line)}`),
    '',
  ].join('\n');
  return { path: '.sourcecraft/ci.yaml', content, label: plan.label, runsTests: plan.runsTests, runsLint: plan.runsLint };
}

function planFor(input: CiTemplateInput): Plan | null {
  const lower = input.paths.map((p) => p.toLowerCase());
  const root = new Set(lower.filter((p) => !p.includes('/')));
  if (input.packageJson !== null && root.has('package.json')) return nodePlan(input.packageJson, root);
  if (root.has('pyproject.toml') || root.has('requirements.txt')) return pythonPlan(input.pyproject, root, lower);
  if (root.has('go.mod')) return goPlan(lower);
  if (root.has('cargo.toml')) return rustPlan();
  if (root.has('gradlew')) {
    return { label: 'Gradle', image: 'docker.io/library/eclipse-temurin:21-jdk', script: ['chmod +x gradlew', './gradlew check --no-daemon'], runsTests: true, runsLint: false };
  }
  if (root.has('pom.xml')) {
    return { label: 'Maven', image: 'docker.io/library/maven:3-eclipse-temurin-21', script: ['mvn -B verify'], runsTests: true, runsLint: false };
  }
  return null;
}

/** npm-заглушка «no test specified» — не тесты. */
const NPM_STUB_TEST = /no test specified/i;

function nodePlan(packageJson: string, root: Set<string>): Plan | null {
  let scripts: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(packageJson) as { scripts?: Record<string, unknown> };
    scripts = parsed.scripts && typeof parsed.scripts === 'object' ? parsed.scripts : {};
  } catch {
    return null;
  }
  const has = (name: string) => typeof scripts[name] === 'string' && (scripts[name] as string).trim() !== '';
  const pm = root.has('pnpm-lock.yaml') ? 'pnpm' : root.has('yarn.lock') ? 'yarn' : 'npm';
  const install =
    pm === 'pnpm'
      ? ['corepack enable', 'pnpm install --frozen-lockfile']
      : pm === 'yarn'
        ? ['corepack enable', 'yarn install --frozen-lockfile']
        : [root.has('package-lock.json') ? 'npm ci' : 'npm install'];
  const run = (name: string) => (pm === 'npm' ? `npm run ${name}` : `${pm} run ${name}`);

  const steps: string[] = [];
  const runsLint = has('lint');
  if (runsLint) steps.push(run('lint'));
  if (has('typecheck')) steps.push(run('typecheck'));
  const runsTests = has('test') && !NPM_STUB_TEST.test(String(scripts.test));
  if (runsTests) steps.push(pm === 'npm' ? 'npm test' : `${pm} test`);
  if (has('build')) steps.push(run('build'));
  if (steps.length === 0) return null;
  return { label: 'Node.js', image: 'docker.io/library/node:24', script: [...install, ...steps], runsTests, runsLint };
}

function pythonPlan(pyproject: string | null, root: Set<string>, lower: string[]): Plan | null {
  const install = root.has('requirements.txt')
    ? ['python -m pip install -r requirements.txt']
    : ['python -m pip install -e .'];
  const hasTests = lower.some((p) => /(^|\/)tests?\//.test(p) || /(^|\/)test_[^/]+\.py$/.test(p) || /_test\.py$/.test(p));
  const usesRuff = /\bruff\b/i.test(pyproject ?? '') || root.has('ruff.toml') || root.has('.ruff.toml');
  const steps: string[] = [];
  if (usesRuff) steps.push('python -m pip install ruff', 'ruff check .');
  if (hasTests) steps.push('python -m pip install pytest', 'python -m pytest -q');
  if (steps.length === 0) return null;
  return { label: 'Python', image: 'docker.io/library/python:3.12', script: [...install, ...steps], runsTests: hasTests, runsLint: usesRuff };
}

function goPlan(lower: string[]): Plan {
  const hasTests = lower.some((p) => p.endsWith('_test.go'));
  return {
    label: 'Go',
    image: 'docker.io/library/golang:1.23',
    script: ['test -z "$(gofmt -l .)"', 'go vet ./...', ...(hasTests ? ['go test ./...'] : ['go build ./...'])],
    runsTests: hasTests,
    runsLint: true,
  };
}

/** cargo test запускает и модульные тесты внутри исходников, отдельный каталог не нужен. */
function rustPlan(): Plan {
  return {
    label: 'Rust',
    image: 'docker.io/library/rust:1',
    script: ['rustup component add clippy', 'cargo clippy --all-targets -- -D warnings', 'cargo test'],
    runsTests: true,
    runsLint: true,
  };
}
