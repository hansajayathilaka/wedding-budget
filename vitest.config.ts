import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/owner-styles.ts',
        'src/lib/types.ts',
        'src/lib/utils.ts',
        'src/lib/notify.ts',
      ],
      thresholds: { lines: 95, functions: 95, statements: 95, branches: 90 },
    },
  },
});
