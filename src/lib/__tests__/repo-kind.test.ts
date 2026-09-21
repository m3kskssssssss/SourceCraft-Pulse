import { describe, expect, it } from 'vitest';
import { classifyRepo, readmeLinkDensity } from '../repo-kind';

const base = {
  name: 'thing',
  description: null,
  files: [] as string[],
  codeFiles: 0,
  readme: null as string | null,
  hasManifest: false,
  hasTests: false,
  hasCi: false,
};

describe('classifyRepo', () => {
  it('обычная библиотека — проект', () => {
    const result = classifyRepo({
      ...base,
      name: 'http-client',
      files: ['package.json', ...Array.from({ length: 40 }, (_, i) => `src/file${i}.ts`)],
      codeFiles: 40,
      hasManifest: true,
      hasTests: true,
      hasCi: true,
    });
    expect(result.kind).toBe('project');
  });

  it('подборка ссылок — материал', () => {
    const result = classifyRepo({
      ...base,
      name: 'awesome-go',
      description: 'A curated list of awesome Go frameworks',
      files: ['README.md', 'CONTRIBUTING.md', 'LICENSE'],
      codeFiles: 0,
      readme:
        'Awesome Go ' +
        Array.from({ length: 60 }, (_, i) => `- [lib${i}](https://example.com/${i}) описание`).join(
          '\n',
        ),
    });
    expect(result.kind).toBe('material');
    expect(result.signals.join(' ')).toContain('ссыл');
  });

  it('конспекты лекций — материал даже без слова awesome', () => {
    const result = classifyRepo({
      ...base,
      name: 'ml-notes',
      files: Array.from({ length: 30 }, (_, i) => `lectures/lecture${i}.md`),
      codeFiles: 0,
    });
    expect(result.kind).toBe('material');
  });

  it('проект с документацией в названии не становится материалом', () => {
    const result = classifyRepo({
      ...base,
      name: 'docs-engine',
      description: 'Статический генератор документации',
      files: ['package.json', ...Array.from({ length: 60 }, (_, i) => `src/x${i}.ts`)],
      codeFiles: 60,
      hasManifest: true,
      hasTests: true,
      hasCi: true,
    });
    expect(result.kind).toBe('project');
  });

  it('пограничный случай честно помечается «непонятно»', () => {
    const result = classifyRepo({
      ...base,
      name: 'snippets',
      files: ['README.md', 'a.py', 'b.py', 'c.py', 'd.py'],
      codeFiles: 4,
    });
    expect(result.kind).toBe('unclear');
  });

  it('объясняет вердикт признаками', () => {
    const result = classifyRepo({ ...base, name: 'awesome-list', files: ['README.md'] });
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe('readmeLinkDensity', () => {
  it('считает ссылки на сто слов', () => {
    const readme = `${'слово '.repeat(100)}[a](https://a) [b](https://b)`;
    expect(readmeLinkDensity(readme)).toBeCloseTo(2, 0);
  });

  it('короткий README не считаем', () => {
    expect(readmeLinkDensity('привет [a](https://a)')).toBeNull();
    expect(readmeLinkDensity(null)).toBeNull();
  });
});
