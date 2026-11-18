import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'public/mockServiceWorker.js'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // XSS: user content is rendered as text. Raw HTML needs a reviewed, sanitized exception.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'dangerouslySetInnerHTML is forbidden; render text, or sanitize and get a security review.',
        },
        {
          // Web storage is readable by any script on the page: never put tokens or personal data there.
          selector:
            "CallExpression[callee.property.name='setItem'][callee.object.name=/^(localStorage|sessionStorage)$/], CallExpression[callee.property.name='setItem'][callee.object.property.name=/^(localStorage|sessionStorage)$/]",
          message:
            'Use the useLocalStorage hook for harmless preferences; never store tokens or personal data.',
        },
      ],
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Assigning innerHTML is an XSS risk; use textContent.' },
        { property: 'outerHTML', message: 'Assigning outerHTML is an XSS risk.' },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/tests/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.jest, ...globals.node } },
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // Tests seed storage directly.
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Route config defines lazy page components next to the route table; it is not an HMR boundary.
    files: ['src/app/router.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
