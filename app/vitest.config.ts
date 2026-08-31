import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // better-sqlite3 is native; must run sequentially
    fileParallelism: false,
    maxWorkers: 1,
  },
});
