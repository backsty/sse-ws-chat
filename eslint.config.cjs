const globals = require('globals');
const js = require('@eslint/js');
const sonarjs = require('eslint-plugin-sonarjs');
const importPlugin = require('eslint-plugin-import');
const jestPlugin = require('eslint-plugin-jest');

module.exports = {
  files: ['**/*.js'],
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/.git/**',
    '**/build/**',
    '**/*.config.js'
  ],
  env: {
    browser: true,
    node: true,
    jest: true,
    es2024: true
  },
  extends: [
    'eslint:recommended',
    'plugin:sonarjs/recommended',
    'plugin:import/recommended',
    'plugin:jest/recommended'
  ],
  plugins: ['sonarjs', 'import', 'jest'],
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module'
  },
  globals: {
    ...globals.browser,
    ...globals.node,
    ...globals.jest
  },
  rules: {
    // Основные правила
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-console': ['warn', {
      allow: ['warn', 'error']
    }],
    
    // Стилистика кода
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'comma-dangle': ['error', 'always-multiline'],
    
    // ES6+ правила
    'no-var': 'error',
    'prefer-const': 'error',
    'arrow-body-style': ['error', 'as-needed'],
    'prefer-template': 'error',
    'object-shorthand': 'error',
    
    // Импорты
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      'alphabetize': {
        'order': 'asc',
        'caseInsensitive': true
      }
    }],
    
    // SonarJS правила
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-duplicate-string': 'error',
    
    // Jest правила
    'jest/valid-expect': 'error',
    'jest/no-disabled-tests': 'warn'
  }
};