import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // 'android'/'android-admin' are native Capacitor projects: their only .js
  // content is synced/compiled web output (minified bundles, Gradle build
  // intermediates), never hand-written source — never lint-worthy.
  globalIgnores(['dist', 'dist-admin', 'android', 'android-admin']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    // Only pulling in `react` for jsx-uses-vars — without it, no-unused-vars
    // can't see that `motion` (etc.) is used via a dotted JSX tag like
    // <motion.div>, and false-flags the import as unused.
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react/jsx-uses-vars': 'error',
    },
  },
])
