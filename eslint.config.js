import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-constant-condition': 'error',
      'no-debugger': 'error',
    },
  },
]
