import tseslint from 'typescript-eslint'

const varDecl = ['const', 'let', 'var']

const multilineTypes = [
  'multiline-block-like',
  'multiline-expression',
  'multiline-const',
  'multiline-let',
  'multiline-var',
]

const ignores = [
  'coverage/**',
  'dist/**',
  '**/dist/**',
  'node_modules/**',
]

const styleRules = {
  'comma-dangle': [
    'error',
    'always-multiline',
  ],
  'indent': [
    'error',
    2,
    { SwitchCase: 1 },
  ],
  'max-len': [
    'error',
    { code: 80 },
  ],
  'no-trailing-spaces': ['error'],
  'object-curly-newline': [
    'error',
    {
      ExportDeclaration: {
        multiline: true,
        consistent: true,
      },
      ImportDeclaration: {
        multiline: true,
        consistent: true,
      },
      ObjectExpression: {
        multiline: true,
        consistent: true,
        minProperties: 2,
      },
      ObjectPattern: {
        multiline: true,
        consistent: true,
      },
    },
  ],
  'object-property-newline': [
    'error',
    {
      allowAllPropertiesOnSameLine: false,
    },
  ],
  'quotes': [
    'error',
    'single',
    {
      allowTemplateLiterals: true,
      avoidEscape: true,
    },
  ],
  'space-before-function-paren': [
    'error',
    {
      anonymous: 'ignore',
      asyncArrow: 'ignore',
      named: 'always',
    },
  ],
  'semi': ['error', 'never'],
  'padding-line-between-statements': [
    'error',
    {
      blankLine: 'always',
      prev: '*',
      next: varDecl,
    },
    {
      blankLine: 'always',
      prev: varDecl,
      next: '*',
    },
    {
      blankLine: 'any',
      prev: varDecl,
      next: varDecl,
    },
    ...multilineTypes.map(type => ({
      blankLine: 'always',
      prev: type,
      next: '*',
    })),
    ...multilineTypes.map(type => ({
      blankLine: 'always',
      prev: '*',
      next: type,
    })),
  ],
}

export default [
  {
    files: ['**/*.js'],
    ignores,
    rules: styleRules,
  },
  {
    files: ['**/*.ts'],
    ignores,
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...styleRules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]
