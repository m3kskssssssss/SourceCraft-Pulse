import { describe, expect, it } from 'vitest';
import { planImprovements, pullRequestDescription, type PlanInput } from '../plan';

const none = {
  hasReadme: false,
  hasLicense: false,
  hasContributing: false,
  hasChangelog: false,
  hasGitignore: false,
  hasEditorConfig: false,
  hasCodeOfConduct: false,
};

const base: PlanInput = {
  org: 'ilugly',
  repo: 'unit-converter',
  description: 'Конвертер единиц',
  language: 'JavaScript',
  paths: ['index.html', 'package.json'],
  flags: none,
  owner: 'Илья Л.',
  year: 2026,
  recommendations: [
    { key: 'docs.license', gain: 6.4 },
    { key: 'code.gitignore', gain: 1.2 },
  ],
};

describe('planImprovements', () => {
  it('предлагает все недостающие файлы, самые выгодные первыми', () => {
    const items = planImprovements(base);
    expect(items.map((i) => i.key)).toContain('add_readme');
    expect(items[0]!.key).toBe('add_license');
    expect(items[0]!.gain).toBe(6.4);
    const paths = items.flatMap((i) => i.files.map((f) => f.path));
    expect(paths).toEqual(
      expect.arrayContaining(['README.md', 'LICENSE', '.gitignore', '.editorconfig', 'CONTRIBUTING.md', 'CHANGELOG.md', 'CODE_OF_CONDUCT.md']),
    );
  });

  it('не трогает то, что уже есть — ни по флагам, ни по дереву', () => {
    const items = planImprovements({
      ...base,
      flags: { ...none, hasLicense: true },
      paths: [...base.paths, 'readme.md'],
    });
    const keys = items.map((i) => i.key);
    expect(keys).not.toContain('add_license');
    expect(keys).not.toContain('add_readme');
  });

  it('ничего не предлагает, когда всё на месте', () => {
    const all = Object.fromEntries(Object.keys(none).map((k) => [k, true])) as PlanInput['flags'];
    expect(planImprovements({ ...base, flags: all })).toEqual([]);
  });

  it('LICENSE — MIT с годом и владельцем, .gitignore — под стек', () => {
    const items = planImprovements(base);
    const license = items.find((i) => i.key === 'add_license')!.files[0]!.content;
    expect(license).toContain('MIT License');
    expect(license).toContain('Copyright (c) 2026 Илья Л.');
    const ignore = items.find((i) => i.key === 'add_gitignore')!;
    expect(ignore.title).toContain('Node.js');
    expect(ignore.files[0]!.content).toContain('node_modules/');
    expect(ignore.files[0]!.content).toContain('.env');
  });

  it('Python-проект получает свой .gitignore и отступ 4', () => {
    const items = planImprovements({ ...base, language: 'Python', paths: ['main.py', 'requirements.txt'] });
    expect(items.find((i) => i.key === 'add_gitignore')!.files[0]!.content).toContain('__pycache__/');
    expect(items.find((i) => i.key === 'add_editorconfig')!.files[0]!.content).toContain('indent_size = 4');
  });
});

describe('pullRequestDescription', () => {
  it('перечисляет изменения, файлы и оговорки', () => {
    const items = planImprovements(base).filter((i) => i.key === 'add_license');
    const text = pullRequestDescription(items, null);
    expect(text).toContain('### Добавить LICENSE (MIT)');
    expect(text).toContain('`LICENSE`');
    expect(text).toContain('Существующие файлы не изменяются');
  });
});
