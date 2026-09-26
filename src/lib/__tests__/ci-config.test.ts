import { describe, expect, it } from 'vitest';
import { summarizeCiConfig } from '../collect';

describe('summarizeCiConfig', () => {
  it('SourceCraft CI: тесты, линтер и pull request', () => {
    const path = '.sourcecraft/ci.yaml';
    const config = [
      'on:',
      '  pull_request:',
      '    - workflows: check',
      'workflows:',
      '  check:',
      '    tasks:',
      '      - name: check',
      '        cubes:',
      '          - name: lint',
      '            script: [npm run lint]',
      '          - name: test',
      '            script: [npm test]',
    ].join('\n');
    const facts = summarizeCiConfig([path], new Map([[path, config]]));
    expect(facts).toEqual({ files: [path], runsTests: true, runsLint: true, runsOnPullRequests: true });
  });

  it('пайплайн только сборки на push', () => {
    const path = '.github/workflows/build.yml';
    const config = 'on: [push]\njobs:\n  build:\n    steps:\n      - run: npm ci && npm run build\n';
    const facts = summarizeCiConfig([path], new Map([[path, config]]));
    expect(facts).toEqual({ files: [path], runsTests: false, runsLint: false, runsOnPullRequests: false });
  });

  it('непрочитанный конфиг в files не попадает', () => {
    expect(summarizeCiConfig(['Jenkinsfile'], new Map()).files).toEqual([]);
  });
});
