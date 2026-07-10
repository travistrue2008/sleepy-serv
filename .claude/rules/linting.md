---
paths:
  - "**.*.js
  - "**.*.mjs"
---

# Linting

Flat config lives at root `eslint.config.mjs`. Run with `bunx eslint .` from the repo root.

## Rules

- **No semicolons** (`semi: never`).
- **Single-quoted strings** (`quotes: single`). Use backticks instead of escaping a single quote inside a string. Do not use double quotes.
- **80-char lines** (`max-len: 80`). Use `/* eslint-disable max-len */` comments exclusively around template literals that change string literals when wrapped.
- **2-space indent** (`indent: 2`, `SwitchCase: 1`).
- **No trailing whitespace** (`no-trailing-spaces`).
- **Trailing commas required on multiline** (`comma-dangle: always-multiline`).
- **Object literal layout:** Object literals with 2+ properties must be multiline, one property per line (`minProperties: 2`). `ObjectPattern`, `ImportDeclaration`, and `ExportDeclaration` are exempt.
- **Array layout:** Array formatting is not linted by ESLint rules. Do not force arbitrary array elements onto new lines unless flagged by the `max-len` 80-character boundary limit.
- **Vertical Whitespace:** Force a blank line before/after any multiline statement, and between a variable declaration and a non-declaration statement. Consecutive single-line declarations do not require a blank line.
- **Function spacing:** Place a single space between a named function's identifier and its parens: `function foo ()`.

## References
- For detailed engineering rationale, historical design choices, and known tooling gaps, see `@.claude/docs/style/linting.md`.
