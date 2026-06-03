import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Vitest config.
 *
 * `vite-tsconfig-paths` teaches Vitest to resolve the same `@config`/`@shared`/…
 * aliases declared in tsconfig.json, so test files can import with aliases just
 * like the rest of the codebase.
 *
 * This file uses the `.mts` extension because the server package is CommonJS
 * while `vite-tsconfig-paths` ships as ESM-only — `.mts` forces ESM loading.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
  },
});
