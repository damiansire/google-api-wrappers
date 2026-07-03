// Config de lint ÚNICA del monorepo (flat, eslint 9). Antes había dos toolchains
// divergentes (eslint8-eslintrc para el paquete JS + eslint9-flat para el TS);
// esta las unifica: reglas JS recommended para todo, reglas TS solo en `.ts`.
// Cada paquete corre `eslint .` y resuelve esta config subiendo al root del workspace.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },

  // Base para todo el código.
  js.configs.recommended,

  // Paquete JS (youtube-fast-api): CommonJS + globals de Node.
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },

  // Paquete TS (google-sheets-wizard): reglas typescript-eslint.
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['**/*.ts', '**/*.tsx'] })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Specs/type-tests requieren el paquete por CommonJS a propósito (verifican el
  // entry point compilado) y usan patrones de tsd: aflojamos esas reglas ahí.
  {
    files: ['**/*.spec.ts', '**/test-d/**/*.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
);
