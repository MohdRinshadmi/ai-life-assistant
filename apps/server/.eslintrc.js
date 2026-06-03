/**
 * ESLint config for the backend (Node + TypeScript).
 *
 * Legacy (.eslintrc) format to match the `eslint src/ --ext .ts` lint script
 * and the mobile app's setup. Path aliases (@config, @shared, …) resolve via
 * TypeScript itself, so no import-resolver plugin is needed here.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'drizzle', 'node_modules', '*.config.ts', '*.config.mts', '*.config.js'],
  rules: {
    // Allow intentionally-unused names when prefixed with `_` (e.g. Express `next`).
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    // Backends legitimately use `any` at framework/error boundaries; surface, don't block.
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off',
  },
};
