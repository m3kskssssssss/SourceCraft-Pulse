import { describe, expect, it } from 'vitest';
import { summarizeCiConfig } from '../../collect';
import { buildCiTemplate } from '../ci-template';

const node = (scripts: Record<string, string>, extra: string[] = []) =>
  buildCiTemplate({
    paths: ['package.json', 'package-lock.json', 'src/index.ts', ...extra],
    defaultBranch: 'main',
    packageJson: JSON.stringify({ name: 'x', scripts }),
    pyproject: null,
  });

describe('buildCiTemplate', () => {
  it('Node: берёт скрипты проекта и ставит зависимости через npm ci', () => {
    const tpl = node({ lint: 'eslint .', test: 'vitest run', build: 'tsc' })!;
    expect(tpl.path).toBe('.sourcecraft/ci.yaml');
    expect(tpl.content).toContain('"npm ci"');
    expect(tpl.content).toContain('"npm run lint"');
    expect(tpl.content).toContain('"npm test"');
    expect(tpl.content).toContain('"npm run build"');
    expect(tpl).toMatchObject({ runsTests: true, runsLint: true, label: 'Node.js' });
  });

  it('наш же детектор засчитывает предложенный конфиг: тесты, линтер, pull request', () => {
    const tpl = node({ lint: 'eslint .', test: 'vitest run' })!;
    const facts = summarizeCiConfig([tpl.path], new Map([[tpl.path, tpl.content]]));
    expect(facts).toMatchObject({ runsTests: true, runsLint: true, runsOnPullRequests: true });
  });

  it('заглушку npm «no test specified» тестами не считает', () => {
    const tpl = node({ test: 'echo "Error: no test specified" && exit 1', build: 'tsc' })!;
    expect(tpl.runsTests).toBe(false);
    expect(tpl.content).not.toContain('npm test');
  });

  it('проверять нечего — конфиг не предлагаем', () => {
    expect(node({ start: 'node index.js' })).toBeNull();
    expect(buildCiTemplate({ paths: ['README.md'], defaultBranch: 'main', packageJson: null, pyproject: null })).toBeNull();
  });

  it('Python: pytest при наличии тестов и ruff, если он упомянут', () => {
    const tpl = buildCiTemplate({
      paths: ['pyproject.toml', 'app/main.py', 'tests/test_main.py'],
      defaultBranch: 'master',
      packageJson: null,
      pyproject: '[tool.ruff]\nline-length = 100\n',
    })!;
    expect(tpl.content).toContain('"python -m pytest -q"');
    expect(tpl.content).toContain('"ruff check ."');
    expect(tpl.content).toContain('branches: ["master"]');
  });
});
