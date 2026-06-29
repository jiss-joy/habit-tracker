import antfu from '@antfu/eslint-config';

export default antfu(
  {
    react: true,
    nextjs: true,
    typescript: {
      tsconfigPath: 'tsconfig.json',
    },
    tailwind: true,
    jsdoc: false,
    toml: false,
    markdown: false,
    ignores: ['src/components/shadcn/**'],

    lessOpinionated: true,
    isInEditor: true,

    formatters: {
      css: true,
      html: true,
      markdown: true,
    },

    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: true,
    },
  },

  // --- Custom rule overrides ---
  {
    rules: {
      'curly': ['error', 'multi-line'],
      'node/prefer-global/process': ['error', 'always'],
    },
  },
  // --- Typescript-specific rule overrides ---
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'ts/strict-boolean-expressions': 'off',
      'ts/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      'ts/no-misused-promises': 'warn',
      'ts/switch-exhaustiveness-check': [
        'error',
        {
          allowDefaultCaseForExhaustiveSwitch: true,
          considerDefaultExhaustiveForUnions: true,
          requireDefaultForNonUnion: false,
        },
      ],
    },
  },
);
