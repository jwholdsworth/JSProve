module.exports = [
  {
    ignores: ['**/*.min.js'],
  },
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
    },
    rules: {
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'valid-typeof': 'error',
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
];
