// Время чтения считаем по словам, а не пишем руками: так оно не разойдётся
// с текстом после правок. Код читается медленнее прозы — строку кода считаем
// за несколько слов.

import type { Block } from './types';

const WORDS_PER_MINUTE = 180;
const WORDS_PER_CODE_LINE = 4;
/** Иллюстрацию разглядывают примерно как абзац средней длины. */
const WORDS_PER_FIGURE = 40;

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function blockWords(block: Block): number {
  switch (block.type) {
    case 'p':
    case 'h2':
    case 'note':
      return countWords(block.text);
    case 'list':
      return block.items.reduce((sum, item) => sum + countWords(item), 0);
    case 'code':
      return block.code.split('\n').filter((line) => line.trim()).length * WORDS_PER_CODE_LINE;
    case 'figure':
      return WORDS_PER_FIGURE + countWords(block.caption);
  }
}

/** Минуты чтения, не меньше одной. */
export function readingMinutes(body: Block[]): number {
  const words = body.reduce((sum, block) => sum + blockWords(block), 0);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export const TIME_BUCKETS = ['short', 'medium', 'long'] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number];

export const TIME_BUCKET_LABEL: Record<TimeBucket, string> = {
  short: 'до 5 мин',
  medium: '6–10 мин',
  long: 'больше 10 мин',
};

export function timeBucket(minutes: number): TimeBucket {
  if (minutes <= 5) return 'short';
  if (minutes <= 10) return 'medium';
  return 'long';
}
