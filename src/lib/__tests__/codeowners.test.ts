import { describe, expect, it } from 'vitest';
import { codeownersStatus } from '../codeowners';

const facts = (paths: string[], missing: string[] = []) =>
  ({ tree: { entriesCount: paths.length, entries: paths.map((path) => ({ path })), flags: {} }, missing }) as never;

describe('codeownersStatus', () => {
  it('находит файл в корне и в .github', () => {
    expect(codeownersStatus(facts(['README.md', 'CODEOWNERS']))).toEqual({ status: 'present', path: 'CODEOWNERS' });
    expect(codeownersStatus(facts(['.github/CODEOWNERS']))).toEqual({ status: 'present', path: '.github/CODEOWNERS' });
  });

  it('нет файла в полном дереве — absent', () => {
    expect(codeownersStatus(facts(['README.md', 'src/CODEOWNERS.md']))).toEqual({ status: 'absent' });
  });

  it('обрезанное дерево без файла — неизвестно, а не «нет»', () => {
    const many = Array.from({ length: 5000 }, (_, i) => `f${i}.ts`);
    expect(codeownersStatus(facts(many))).toEqual({ status: 'unknown', reason: 'tree_truncated' });
  });

  it('дерево не получено — неизвестно', () => {
    expect(codeownersStatus(facts([], ['tree_fetch_failed']))).toEqual({ status: 'unknown', reason: 'tree_unavailable' });
  });
});
