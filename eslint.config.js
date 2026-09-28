import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Use the shared Axios client from src/api/http.ts for API calls.',
        },
        {
          name: 'XMLHttpRequest',
          message: 'Use the shared Axios client from src/api/http.ts for API calls.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'fetch',
          message: 'Use the shared Axios client from src/api/http.ts for API calls.',
        },
        {
          object: 'globalThis',
          property: 'fetch',
          message: 'Use the shared Axios client from src/api/http.ts for API calls.',
        },
      ],
    },
  },
])
