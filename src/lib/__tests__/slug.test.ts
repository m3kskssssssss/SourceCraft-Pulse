import { describe, expect, it } from 'vitest';
import { InvalidSlugError, parseSlug, tryParseSlug } from '../slug';

describe('parseSlug', () => {
  it('простой org/repo', () => {
    expect(parseSlug('vladleonff/menger')).toEqual({ org: 'vladleonff', repo: 'menger' });
  });

  it('пробелы отрезаются', () => {
    expect(parseSlug('  vladleonff/menger  ')).toEqual({ org: 'vladleonff', repo: 'menger' });
  });

  it('поддерживает https://sourcecraft.tech/org/repo', () => {
    expect(parseSlug('https://sourcecraft.tech/vladleonff/menger')).toEqual({
      org: 'vladleonff',
      repo: 'menger',
    });
  });

  it('срезает .git', () => {
    expect(parseSlug('vladleonff/menger.git')).toEqual({ org: 'vladleonff', repo: 'menger' });
  });

  it('точки и дефисы допустимы', () => {
    expect(parseSlug('acme-org/awesome.repo')).toEqual({ org: 'acme-org', repo: 'awesome.repo' });
  });

  it('лидирующий дефис — ошибка', () => {
    expect(() => parseSlug('-org/repo')).toThrow(InvalidSlugError);
  });

  it('без слэша — ошибка', () => {
    expect(() => parseSlug('vladleonffmenger')).toThrow(InvalidSlugError);
  });

  it('пустой — ошибка', () => {
    expect(() => parseSlug('')).toThrow(InvalidSlugError);
  });

  it('слишком много частей — ошибка', () => {
    expect(() => parseSlug('a/b/c')).toThrow(InvalidSlugError);
  });

  it('tryParseSlug возвращает null для мусора', () => {
    expect(tryParseSlug('!!!')).toBeNull();
    expect(tryParseSlug('a/b')).toEqual({ org: 'a', repo: 'b' });
  });
});
