import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    // The specs require() the package on purpose: they assert the CommonJS
    // entry point works (see dist-test/builded-package.spec.ts "require method").
    files: ['**/*.spec.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  }
);
