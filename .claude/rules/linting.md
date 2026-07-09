# Linting

Flat config lives at root `eslint.config.mjs`. Run with `bunx eslint .` from the repo root.

- `.mjs`, not `.js`: root `package.json` has no `"type": "module"`, and ESLint's flat-config
  loader decides CJS vs ESM per-extension rather than relying on Bun's own module-format
  sniffing — `.mjs` is unambiguous ESM regardless of the nearest `package.json`.
- `eslint@9` is a devDependency of the root `package.json` (not any individual workspace
  member), since the config and rules apply uniformly across `packages/server`,
  `packages/client`, and `tests/`.

## Rules

- **No semicolons** (`semi: never`).
- **Single-quoted strings** (`quotes: single`, `avoidEscape: true`,
  `allowTemplateLiterals: true`). Use backticks instead of escaping a single quote inside a
  string — don't fall back to double quotes for that (ESLint's built-in `avoidEscape` only
  offers a double-quote fallback; there's no built-in "prefer backtick over double" mode, so
  this half has to be applied by hand rather than relying on `--fix`).
- **80-char lines** (`max-len: 80`). A handful of test assertions build error strings from
  `${process.cwd()}/...` inside template literals — wrapping those would change the literal
  content being asserted on, so those specific statements are wrapped in
  `/* eslint-disable max-len */` / `/* eslint-enable max-len */` instead of being reflowed.
- **2-space indent** (`indent: 2`, `SwitchCase: 1`) — needed as a companion to the
  object/array formatting rules below, since their autofixers insert line breaks but don't
  reindent on their own.
- **No trailing whitespace** (`no-trailing-spaces`) — cleans up a stray-whitespace artifact
  the object/array autofixers can leave behind.
- **Trailing commas required on multiline** (`comma-dangle: always-multiline`).
- **Object literals with 2+ properties go multiline, one property per line**
  (`object-curly-newline` + `object-property-newline`, `minProperties: 2`). Scoped to
  `ObjectExpression` only — `ObjectPattern` (destructuring) and `ImportDeclaration`/
  `ExportDeclaration` braces are exempt, since forcing those apart produced ragged,
  badly-indented output for common cases like `const { a, b } = x` and
  `import { a, b } from 'x'`.
- **Array formatting is not linted, by design.** `array-bracket-newline`/`array-element-newline`
  were tried and reverted: both only trigger when an *element itself* spans multiple lines
  (e.g. an object-literal element), not based on the array's rendered line length — ESLint's
  autofixer has no "wrap only if too long" mode (that's a Prettier-style concern, not something
  ESLint core rules do). In practice this collapsed long arrays onto one over-80-char line while
  forcing short ones like `['null', 'object', 'array']` onto separate lines for no benefit.
  `max-len` still flags an array line that's genuinely too long; wrapping it (one element per
  line) is a manual/human call, same as the `max-len`-disabled template-literal cases above.
- **Blank line before/after any multiline statement, and between a variable declaration and
  a non-declaration statement (either direction)** (`padding-line-between-statements`).
  Consecutive variable declarations don't require a blank line between them unless one of
  them is itself multiline.
- **Space between a named function's identifier and its parens** (`function foo ()`, not
  `function foo()`) (`space-before-function-paren`, `named: always`, `anonymous`/
  `asyncArrow: ignore`).

## Known gaps

- Import-priority sorting (defaults vs. mixed vs. glob vs. named vs. multiline-named imports,
  and a secondary sort key within each group) was requested but not yet specified/implemented.
