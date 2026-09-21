import { describe, expect, it } from 'vitest';
import { censusDirectories, spreadPick, withoutSkipped } from '../tree-map';

/** Генератор путей: n файлов в каталоге с указанным расширением. */
function files(dir: string, n: number, ext: string): string[] {
  return Array.from({ length: n }, (_, i) => `${dir}/file${i}.${ext}`);
}

describe('censusDirectories', () => {
  it('считает файлы и языки по каталогам', () => {
    const stats = censusDirectories([
      ...files('client/android', 30, 'kt'),
      ...files('client/web', 10, 'ts'),
      'README.md',
    ]);
    const android = stats.find((s) => s.dir === 'client/android');
    expect(android?.files).toBe(30);
    expect(android?.languages).toEqual(['Kotlin']);
    // Самый крупный каталог идёт первым.
    expect(stats[0]?.dir).toBe('client/android');
  });

  it('исключает каталоги переводов и тестовых данных', () => {
    const stats = censusDirectories([
      ...files('src/locales', 200, 'json'),
      ...files('src/core', 20, 'ts'),
    ]);
    expect(stats.find((s) => s.dir === 'src/locales')?.skipped).toBe(true);
    expect(stats.find((s) => s.dir === 'src/core')?.skipped).toBe(false);
  });

  it('не исключает большой каталог с кодом', () => {
    const stats = censusDirectories(files('packages/ui', 900, 'tsx'));
    expect(stats[0]?.skipped).toBe(false);
    expect(stats[0]?.files).toBe(900);
  });

  it('исключает гору файлов без узнаваемого языка', () => {
    const stats = censusDirectories(files('build/out', 300, 'bin'));
    expect(stats[0]?.skipped).toBe(true);
    expect(stats[0]?.reason).toContain('без узнаваемого языка');
  });
});

describe('spreadPick', () => {
  it('раздаёт лимит по каталогам, а не отдаёт первому', () => {
    const paths = [
      ...files('a/one', 500, 'ts'),
      ...files('b/two', 5, 'go'),
      ...files('c/three', 5, 'py'),
    ];
    const picked = spreadPick(paths, 30);
    expect(picked).toHaveLength(30);
    expect(picked.some((p) => p.startsWith('b/two'))).toBe(true);
    expect(picked.some((p) => p.startsWith('c/three'))).toBe(true);
  });

  it('берёт всё, если файлов меньше лимита', () => {
    const paths = files('src', 4, 'ts');
    expect(spreadPick(paths, 100)).toEqual(paths);
  });

  it('не зацикливается, когда каталоги кончились раньше лимита', () => {
    const paths = [...files('a', 2, 'ts'), ...files('b', 2, 'ts')];
    expect(spreadPick(paths, 50)).toHaveLength(4);
  });
});

describe('withoutSkipped', () => {
  it('убирает файлы исключённых каталогов', () => {
    const paths = [...files('src/locales', 200, 'json'), ...files('src/core', 3, 'ts')];
    const stats = censusDirectories(paths);
    const kept = withoutSkipped(paths, stats);
    expect(kept.every((p) => p.startsWith('src/core'))).toBe(true);
  });
});
