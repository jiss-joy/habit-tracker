import antfu from '@antfu/eslint-config'

export default antfu(
  {
    react: true,
    nextjs: true,
    typescript: {
      tsconfigPath: 'tsconfig.json',
    },
    jsdoc: false,
    toml: false,
    markdown: false,
    ignores: ['src/components/shadcn/**'],

    lessOpinionated: true,
    isInEditor: false,

    stylistic: false
  },

  // --- Custom rule overrides ---
  {
    rules: {
      'curly': ['error', 'multi-line'],
      'node/prefer-global/process': ['error', 'always'],
    }
  },
  // --- Typescript-specific rule overrides ---
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'ts/switch-exhaustiveness-check': [
        'error',
        {
          allowDefaultCaseForExhaustiveSwitch: true,
          considerDefaultExhaustiveForUnions: true,
          requireDefaultForNonUnion: false
        }
      ]
    }
  }
)
