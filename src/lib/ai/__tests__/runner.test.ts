import { describe, expect, it } from 'vitest';
import { stripCodeFences } from '../runner';

describe('stripCodeFences', () => {
  it('без обёрток возвращает как есть', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });

  it('снимает ```json … ```', () => {
    const src = '```json\n{"a":1}\n```';
    expect(stripCodeFences(src)).toBe('{"a":1}');
  });

  it('снимает ``` … ``` без указания языка', () => {
    const src = '```\n{"a":1}\n```';
    expect(stripCodeFences(src)).toBe('{"a":1}');
  });

  it('пробелы вокруг обрезаются', () => {
    expect(stripCodeFences('   {"a":1}   ')).toBe('{"a":1}');
  });
});
