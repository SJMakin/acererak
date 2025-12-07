module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json', // Required for rules that need type information
  },
  plugins: [
    'react',
    '@typescript-eslint',
    'react-hooks',
    'unused-imports',
    'import',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
    'import/external-module-folders': ['node_modules', 'node_modules/@types'],
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',

    // TypeScript Strictness Rules
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    '@typescript-eslint/prefer-optional-chain': 'error',

    // React Hooks Rules
    'react-hooks/exhaustive-deps': 'error',
    'react-hooks/rules-of-hooks': 'error',

    // Import Organization Rules
    'import/order': 'off', // Temporarily disabled due to ESLint 9 compatibility issue
    'import/no-unresolved': 'off', // Temporarily disabled due to ESLint 9 compatibility issue
    'import/no-duplicates': 'off', // Temporarily disabled due to ESLint 9 compatibility issue
    'import/named': 'off', // Temporarily disabled due to ESLint 9 compatibility issue
    'import/namespace': 'off', // Temporarily disabled due to ESLint 9 compatibility issue
    'import/default': 'off', // Temporarily disabled due to ESLint 9 compatibility issue
    'import/export': 'off', // Temporarily disabled due to ESLint 9 compatibility issue

    // Variable Rules
    'no-undef': 'error', // Catch undefined variables at build time
    
    // Unused Variables Rules
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }
    ],
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // Disable import plugin warnings due to ESLint 9 compatibility issues
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
  },
};
