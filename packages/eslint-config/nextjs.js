const tseslint = require('@typescript-eslint/eslint-plugin');
const reactHooks = require('eslint-plugin-react-hooks');
const nextPlugin = require('@next/eslint-plugin-next');
const base = require('./base.js');

module.exports = [
  ...base,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
    },
  },
];
