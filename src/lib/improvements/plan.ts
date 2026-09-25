// Что Pulse может сам добавить в репозиторий через pull request.
//
// Только новые файлы, которых в репозитории нет, — существующие не трогаем
// никогда: переписать чужой README или конфиг вслепую хуже, чем не помочь.
// Предлагаем то, что можно сделать хорошо без понимания кода: LICENSE,
// README, .gitignore под язык, .editorconfig, CONTRIBUTING, CHANGELOG,
// CODE_OF_CONDUCT.
//
// Чего не предлагаем, хотя рекомендации такие есть:
//   - CI и шаблоны задач SourceCraft: их формат нам неизвестен, а выдумывать
//     конфиг, который молча не заработает, нельзя;
//   - тесты, линтер, разбиение файлов: это работа с кодом, её шаблоном не сделать.
//
// Чистая функция без БД и сети — ради Vitest-теста.

export type ImprovementKey =
  | 'add_license'
  | 'add_readme'
  | 'add_gitignore'
  | 'add_editorconfig'
  | 'add_contributing'
  | 'add_changelog'
  | 'add_code_of_conduct';

export type ImprovementFile = { path: string; content: string };

export type Improvement = {
  key: ImprovementKey;
  title: string;
  /** Зачем это нужно — простыми словами, для экрана и описания PR. */
  why: string;
  /** Что стоит проверить перед слиянием. */
  note?: string;
  files: ImprovementFile[];
  /** Ожидаемый прирост балла из рекомендаций анализа; null — не посчитан. */
  gain: number | null;
};

export type PlanInput = {
  org: string;
  repo: string;
  description: string | null;
  language: string | null;
  /** Пути файлов в корне и глубже — из дерева репозитория. */
  paths: string[];
  flags: {
    hasReadme: boolean;
    hasLicense: boolean;
    hasContributing: boolean;
    hasChangelog: boolean;
    hasGitignore: boolean;
    hasEditorConfig: boolean;
    hasCodeOfConduct: boolean;
  };
  /** Кто правообладатель в LICENSE — отображаемое имя владельца. */
  owner: string;
  year: number;
  /** Рекомендации анализа: из них берём ожидаемый прирост. */
  recommendations: Array<{ key: string; gain: number }>;
};

/** Метрика анализа, которую закрывает каждое изменение. */
const METRIC_OF: Record<ImprovementKey, string> = {
  add_license: 'docs.license',
  add_readme: 'docs.readme',
  add_gitignore: 'code.gitignore',
  add_editorconfig: 'code.editorconfig',
  add_contributing: 'docs.contributing',
  add_changelog: 'docs.changelog',
  add_code_of_conduct: 'docs.code_of_conduct',
};

export function planImprovements(input: PlanInput): Improvement[] {
  const gainOf = (key: ImprovementKey): number | null => {
    const rec = input.recommendations.find((r) => r.key === METRIC_OF[key]);
    return rec ? Math.round(rec.gain * 10) / 10 : null;
  };
  const has = (path: string): boolean =>
    input.paths.some((p) => p.toLowerCase() === path.toLowerCase());

  const out: Improvement[] = [];

  if (!input.flags.hasReadme && !has('README.md')) {
    out.push({
      key: 'add_readme',
      title: 'Добавить README',
      why: 'README — первое, что видит человек на странице репозитория: что это, как запустить, как помочь. Без него проект выглядит заброшенным.',
      note: 'Черновик собран по данным репозитория — допишите, что проект делает и зачем.',
      files: [{ path: 'README.md', content: readme(input) }],
      gain: gainOf('add_readme'),
    });
  }

  if (!input.flags.hasLicense && !has('LICENSE')) {
    out.push({
      key: 'add_license',
      title: 'Добавить LICENSE (MIT)',
      why: 'Без лицензии чужой код по умолчанию нельзя использовать и изменять — даже если репозиторий публичный. MIT — самая короткая и распространённая открытая лицензия.',
      note: `Правообладателем указан «${input.owner}». Выбор лицензии — ваше решение: если нужна другая, замените файл до слияния.`,
      files: [{ path: 'LICENSE', content: mitLicense(input.owner, input.year) }],
      gain: gainOf('add_license'),
    });
  }

  if (!input.flags.hasGitignore && !has('.gitignore')) {
    const stack = detectStack(input);
    out.push({
      key: 'add_gitignore',
      title: `Добавить .gitignore${stack.label ? ` для ${stack.label}` : ''}`,
      why: 'Не даёт закоммитить сборку, зависимости, секреты из .env и мусор редактора — то, что раздувает репозиторий и иногда утекает.',
      files: [{ path: '.gitignore', content: gitignore(stack.kind) }],
      gain: gainOf('add_gitignore'),
    });
  }

  if (!input.flags.hasEditorConfig && !has('.editorconfig')) {
    out.push({
      key: 'add_editorconfig',
      title: 'Добавить .editorconfig',
      why: 'Одинаковые отступы, кодировка и переводы строк у всех редакторов — меньше шумных диффов «поменял только пробелы».',
      files: [{ path: '.editorconfig', content: editorconfig(detectStack(input).kind) }],
      gain: gainOf('add_editorconfig'),
    });
  }

  if (!input.flags.hasContributing && !has('CONTRIBUTING.md')) {
    out.push({
      key: 'add_contributing',
      title: 'Добавить CONTRIBUTING.md',
      why: 'Короткие правила участия: как предложить изменение, как оформить коммит и PR. Снижает порог для новых участников.',
      files: [{ path: 'CONTRIBUTING.md', content: contributing(input) }],
      gain: gainOf('add_contributing'),
    });
  }

  if (!input.flags.hasChangelog && !has('CHANGELOG.md')) {
    out.push({
      key: 'add_changelog',
      title: 'Завести CHANGELOG.md',
      why: 'История изменений по версиям: пользователям видно, что поменялось и стоит ли обновляться.',
      files: [{ path: 'CHANGELOG.md', content: changelog() }],
      gain: gainOf('add_changelog'),
    });
  }

  if (!input.flags.hasCodeOfConduct && !has('CODE_OF_CONDUCT.md')) {
    out.push({
      key: 'add_code_of_conduct',
      title: 'Добавить CODE_OF_CONDUCT.md',
      why: 'Правила общения в задачах и ревью. Показывает, что в проекте рады новым людям и не терпят грубости.',
      note: 'Укажите в файле контакт, куда сообщать о нарушениях.',
      files: [{ path: 'CODE_OF_CONDUCT.md', content: codeOfConduct() }],
      gain: gainOf('add_code_of_conduct'),
    });
  }

  // Сначала то, что сильнее двигает оценку.
  return out.sort((a, b) => (b.gain ?? 0) - (a.gain ?? 0));
}

/** Текст описания PR: что меняется и почему. */
export function pullRequestDescription(items: Improvement[], analysisUrl: string | null): string {
  const lines = [
    'Pulse предлагает добавить в репозиторий недостающие файлы. Существующие файлы не изменяются.',
    '',
    ...items.flatMap((item) => [
      `### ${item.title}`,
      '',
      `Файлы: ${item.files.map((f) => `\`${f.path}\``).join(', ')}`,
      '',
      item.why,
      ...(item.note ? ['', `> ${item.note}`] : []),
      '',
    ]),
  ];
  if (analysisUrl) lines.push(`Оценка репозитория, по которой собраны изменения: ${analysisUrl}`);
  return lines.join('\n');
}

// ---------- Стек проекта ----------

type StackKind = 'node' | 'python' | 'go' | 'rust' | 'java' | 'dotnet' | 'generic';

function detectStack(input: PlanInput): { kind: StackKind; label: string | null } {
  const top = new Set(input.paths.map((p) => p.toLowerCase()));
  const lang = (input.language ?? '').toLowerCase();
  if (top.has('package.json') || ['javascript', 'typescript'].includes(lang)) {
    return { kind: 'node', label: 'Node.js' };
  }
  if (
    top.has('requirements.txt') ||
    top.has('pyproject.toml') ||
    top.has('setup.py') ||
    lang === 'python' ||
    input.paths.some((p) => p.toLowerCase().endsWith('.ipynb'))
  ) {
    return { kind: 'python', label: 'Python' };
  }
  if (top.has('go.mod') || lang === 'go') return { kind: 'go', label: 'Go' };
  if (top.has('cargo.toml') || lang === 'rust') return { kind: 'rust', label: 'Rust' };
  if (top.has('pom.xml') || top.has('build.gradle') || top.has('build.gradle.kts') || ['java', 'kotlin'].includes(lang)) {
    return { kind: 'java', label: 'Java/Kotlin' };
  }
  if (input.paths.some((p) => /\.(csproj|sln)$/i.test(p)) || ['c#', 'csharp'].includes(lang)) {
    return { kind: 'dotnet', label: '.NET' };
  }
  return { kind: 'generic', label: null };
}

// ---------- Шаблоны файлов ----------

function readme(input: PlanInput): string {
  const stack = detectStack(input);
  const top = new Set(input.paths.map((p) => p.toLowerCase()));
  const run: string[] = [];
  if (stack.kind === 'node') run.push('npm install', 'npm start');
  else if (stack.kind === 'python' && top.has('requirements.txt')) run.push('pip install -r requirements.txt');
  else if (stack.kind === 'go') run.push('go run .');
  else if (stack.kind === 'rust') run.push('cargo run');

  const sections = [
    `# ${input.repo}`,
    '',
    input.description?.trim() || 'Коротко: что делает проект и для кого он.',
    '',
    '## Как запустить',
    '',
    ...(run.length
      ? ['```bash', `git clone https://git.sourcecraft.dev/${input.org}/${input.repo}.git`, `cd ${input.repo}`, ...run, '```']
      : ['Опишите шаги: что установить и какой командой запустить.']),
    '',
    '## Как помочь проекту',
    '',
    'Предложения и исправления — через pull request.',
    '',
  ];
  if (input.flags.hasLicense) sections.push('## Лицензия', '', 'См. файл LICENSE.', '');
  return sections.join('\n');
}

function mitLicense(owner: string, year: number): string {
  return `MIT License

Copyright (c) ${year} ${owner}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

const GITIGNORE_COMMON = ['# Окружение и секреты', '.env', '.env.*', '!.env.example', '', '# Редакторы и ОС', '.idea/', '.vscode/', '*.swp', '.DS_Store', 'Thumbs.db', ''];

const GITIGNORE_STACK: Record<StackKind, string[]> = {
  node: ['# Node.js', 'node_modules/', 'dist/', 'build/', '.next/', 'coverage/', 'npm-debug.log*', 'yarn-error.log*', '.pnpm-debug.log*'],
  python: ['# Python', '__pycache__/', '*.py[cod]', '.venv/', 'venv/', '.pytest_cache/', '.mypy_cache/', '*.egg-info/', 'dist/', 'build/', '.ipynb_checkpoints/'],
  go: ['# Go', '/bin/', '*.exe', '*.test', '*.out', 'vendor/'],
  rust: ['# Rust', '/target/'],
  java: ['# Java / Kotlin', 'target/', 'build/', '.gradle/', '*.class', '*.jar', 'out/'],
  dotnet: ['# .NET', 'bin/', 'obj/', '*.user', '.vs/'],
  generic: ['# Сборка и логи', 'dist/', 'build/', '*.log'],
};

function gitignore(kind: StackKind): string {
  return [...GITIGNORE_COMMON, ...GITIGNORE_STACK[kind], ''].join('\n');
}

function editorconfig(kind: StackKind): string {
  // Отступ по обычаю стека: в Python и Go свои устоявшиеся правила.
  const indent =
    kind === 'python' || kind === 'java' || kind === 'dotnet' || kind === 'rust'
      ? ['indent_style = space', 'indent_size = 4']
      : kind === 'go'
        ? ['indent_style = tab']
        : ['indent_style = space', 'indent_size = 2'];
  return [
    'root = true',
    '',
    '[*]',
    'charset = utf-8',
    'end_of_line = lf',
    'insert_final_newline = true',
    'trim_trailing_whitespace = true',
    ...indent,
    '',
    '[*.md]',
    'trim_trailing_whitespace = false',
    '',
    '[Makefile]',
    'indent_style = tab',
    '',
  ].join('\n');
}

function contributing(input: PlanInput): string {
  return `# Как помочь проекту ${input.repo}

Спасибо, что хотите помочь!

## Как предложить изменение

1. Создайте ветку от основной: \`git checkout -b fix/коротко-о-сути\`.
2. Делайте небольшие коммиты с понятными сообщениями: что изменилось и зачем.
3. Откройте pull request и опишите, какую проблему он решает.

## Сообщить об ошибке

Заведите задачу: что делали, что ожидали, что получилось. Шаги для
воспроизведения и версия окружения сильно ускоряют разбор.

## Стиль

Следуйте стилю соседнего кода. Отступы и переводы строк задаёт .editorconfig.
`;
}

function changelog(): string {
  return `# Changelog

Все заметные изменения проекта записываются в этот файл.

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версии — [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### Добавлено

-
`;
}

function codeOfConduct(): string {
  return `# Правила поведения

Мы хотим, чтобы участие в проекте было комфортным для всех — независимо от
опыта, происхождения и взглядов.

## Что мы ожидаем

- Уважительный тон в задачах, комментариях и ревью.
- Критику кода, а не людей.
- Готовность выслушать другую точку зрения.

## Что недопустимо

- Оскорбления, травля, дискриминационные высказывания.
- Публикация чужих личных данных без согласия.

## Куда сообщать

О нарушениях пишите сопровождающим проекта: <укажите контакт>.
Каждое обращение будет рассмотрено.
`;
}
