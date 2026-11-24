import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/shared/tests/**/*.test.ts',
      'trails/src/**/__tests__/**/*.test.ts',
      'gleis/src/**/__tests__/**/*.test.ts',
    ],
  },
});
