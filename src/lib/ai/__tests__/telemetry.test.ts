import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConsoleAiTelemetry, makeAiCallRecord, usdToRub } from '../telemetry';

const ORIGINAL_RATE = process.env.USD_RUB_RATE;

beforeEach(() => {
  process.env.USD_RUB_RATE = '100';
});
afterEach(() => {
  if (ORIGINAL_RATE === undefined) delete process.env.USD_RUB_RATE;
  else process.env.USD_RUB_RATE = ORIGINAL_RATE;
});

describe('usdToRub', () => {
  it('умножает на курс', () => {
    expect(usdToRub(1.5)).toBeCloseTo(150, 6);
  });

  it('невалидный курс → 0', () => {
    process.env.USD_RUB_RATE = 'abc';
    expect(usdToRub(1)).toBe(0);
  });
});

describe('ConsoleAiTelemetry', () => {
  it('накапливает monthlySpendRub', async () => {
    const t = new ConsoleAiTelemetry();
    const originalLog = console.log;
    console.log = () => undefined; // подавляем вывод в тестах
    try {
      await t.record(
        makeAiCallRecord({
          provider: 'x',
          model: 'm',
          task: 't',
          status: 'ok',
          result: {
            text: 'y',
            promptTokens: 10,
            completionTokens: 5,
            costUsd: 0.01,
            latencyMs: 100,
            reportedModel: null,
          },
        }),
      );
      await t.record(
        makeAiCallRecord({
          provider: 'x',
          model: 'm',
          task: 't',
          status: 'cached',
        }),
      );
    } finally {
      console.log = originalLog;
    }
    // 0.01 USD * 100 руб/USD + 0 (cached) = 1 руб
    expect(await t.monthlySpendRub()).toBeCloseTo(1, 6);
  });
});
