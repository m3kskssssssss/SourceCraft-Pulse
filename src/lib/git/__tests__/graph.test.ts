import { describe, expect, it } from 'vitest';
import { assignLanes } from '../graph';

/** Коммиты идут от новых к старым — так же, как их отдаёт git log. */
function c(oid: string, ...parents: string[]) {
  return { oid, parents };
}

describe('assignLanes', () => {
  it('линейную историю держит на одной дорожке', () => {
    const { lanes, laneCount } = assignLanes([c('d', 'c'), c('c', 'b'), c('b', 'a'), c('a')]);
    expect(lanes).toEqual([0, 0, 0, 0]);
    expect(laneCount).toBe(1);
  });

  it('ветку от merge уводит на соседнюю дорожку и сводит обратно', () => {
    // m — слияние: первый родитель a (основная линия), второй b (ветка).
    const { lanes, laneCount } = assignLanes([
      c('m', 'a', 'b'),
      c('a', 'c'),
      c('b', 'c'),
      c('c'),
    ]);
    expect(lanes).toEqual([0, 0, 1, 0]);
    expect(laneCount).toBe(2);
  });

  it('освободившуюся дорожку отдаёт следующей ветке', () => {
    const { laneCount } = assignLanes([
      c('m2', 'x', 'y'),
      c('x', 'm1'),
      c('y', 'm1'),
      c('m1', 'a', 'b'),
      c('a', 'r'),
      c('b', 'r'),
      c('r'),
    ]);
    // Две ветки идут не одновременно, значит третья дорожка не нужна.
    expect(laneCount).toBe(2);
  });

  it('две одновременные ветки занимают три дорожки', () => {
    const { lanes, laneCount } = assignLanes([
      c('m', 'a', 'b', 'e'), // octopus-merge: сразу три родителя
      c('a', 'r'),
      c('b', 'r'),
      c('e', 'r'),
      c('r'),
    ]);
    expect(lanes).toEqual([0, 0, 1, 2, 0]);
    expect(laneCount).toBe(3);
  });

  it('обрывки истории без родителей не ломают раскладку', () => {
    const { lanes } = assignLanes([c('b', 'missing'), c('a', 'gone')]);
    expect(lanes).toEqual([0, 1]);
  });

  it('пустой список даёт одну дорожку и ноль строк', () => {
    const { lanes, laneCount } = assignLanes([]);
    expect(lanes).toEqual([]);
    expect(laneCount).toBe(1);
  });
});
