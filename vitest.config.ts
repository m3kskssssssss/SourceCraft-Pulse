import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Тестируем только чистые модули: движок оценки и парсеры.
// `include` намеренно узкий, чтобы Vitest не пытался запускать серверные роуты и .tsx.

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    reporters: 'default',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
