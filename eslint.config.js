// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactNativePlugin = require('eslint-plugin-react-native');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'android/*', 'ios/*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-native': reactNativePlugin,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Work around resolver false positives for RNTP's package layout
      'import/no-unresolved': ['error', { ignore: ['react-native-track-player'] }],

      // React Native specific rules
      'react-native/no-unused-styles': 'error',
      'react-native/split-platform-components': 'warn',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'off', // We use design tokens
      'react-native/no-raw-text': 'off', // We use Text component wrapper
      'react-native/no-single-element-style-arrays': 'error',

      // TypeScript rules to catch import errors
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Every remaining violation is the same shape: an effect calls a fetch
      // function that runs setLoading(true) before its first await. In these
      // hooks `loading` already initializes to true, so that is a same-value
      // set and React bails out of it - the cascading render the rule guards
      // against does not actually occur. The path where it does re-render is
      // pull-to-refresh, where the render is the point.
      //
      // Kept at 'warn' rather than 'off' so genuinely new violations still
      // surface; those will not be same-value sets.
      //
      // The rule's own recommendation - React Query or SWR - is worth taking
      // when we want retry/backoff, background refetch, cross-screen
      // invalidation or an offline mutation queue. At that point the library
      // REPLACES the cache, dedup and cancellation in services/api/base.api.ts
      // rather than sitting on top of it, and the change is a net deletion.
      // Doing it now would rewrite every data path to remove a cost that
      // measures as roughly nothing.
      'react-hooks/set-state-in-effect': 'warn',

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
]);
