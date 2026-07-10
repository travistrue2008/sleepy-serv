# Linting

This document details the architectural choices, historical context, and technical tool limitations behind our linting configurations in `eslint.config.mjs`.

## Global Environment Decisions

### Configuration File Format (`.mjs`)

- **Choice:** Flat configuration lives strictly at the root as `eslint.config.mjs`.
- **Rationale:** The root `package.json` intentionally does not include `"type": "module"`. ESLint's flat-config loader determines CommonJS (CJS) versus ECMAScript Modules (ESM) per-extension, rather than relying on Bun's internal module-format sniffing. Using `.mjs` guarantees unambiguous ESM behavior regardless of any local or nested `package.json` constraints.

### Dependency Scoping (`eslint@9`)

- **Choice:** `eslint@9` is declared purely as a `devDependency` in the root `package.json`.
- **Rationale:** It is omitted from individual workspace members to guarantee that linting rules apply uniformly and identically across `packages/server`, `packages/client`, and `tests/`.

## Technical Rationales for Specific Rules

### String Quotes & Backtick Escalation

- **Rule Context:** `quotes: single`, `avoidEscape: true`, `allowTemplateLiterals: true`
- **Tooling Limitation:** ESLint's native `avoidEscape` configuration option only offers a double-quote fallback when a single quote is used inside a string. There is no built-in "prefer backtick over double-quote" fallback behavior.
- **Enforcement:** Because the automated engine cannot cleanly handle this preference via `--fix`, engineers and AI assistants must manually substitute template literal backticks instead of falling back to double quotes or using forward-slash escape characters.

### Maximum Line Length Edge Cases

- **Rule Context:** `max-len: 80`
- **Exception Context:** A small subset of test assertions dynamically construct error strings containing paths like `${process.cwd()}/...` inside template literals.
- **Rationale:** Wrapping these long template lines across multiple lines physically modifies the literal string values being evaluated by the test runner, causing false test failures. To prevent this without abandoning the 80-character ceiling globally, wrap these specific evaluation blocks using local block disables: `/* eslint-disable max-len */` and `/* eslint-enable max-len */`.

### Indentation and Whitespace Companions

- **Rule Context:** `indent: 2`, `SwitchCase: 1`, and `no-trailing-spaces`
- **Rationale:** These rules are critical operational companions to the structural object/array rules. ESLint object autofixers regularly introduce hard line breaks when collapsing or splitting objects, but they frequently fail to calculate matching indentation or clean up structural whitespace artifacts on the newly broken lines. These accompanying rules ensure the automated layout engine cleans up after itself.

### Object Literal Scoping

- **Rule Context:** `object-curly-newline` + `object-property-newline` with `minProperties: 2`
- **Exemptions:** Scoped strictly to `ObjectExpression`. Destructuring targets (`ObjectPattern`), `ImportDeclaration` statements, and `ExportDeclaration` block brackets are explicitly exempt.
- **Rationale:** Attempting to force multi-line splits across imports or destructuring targets yields ragged, highly fragmented, and unreadable indentation for incredibly common single-line expressions like `const { a, b } = x` or `import { a, b } from 'x'`.

### Deployed and Reverted Experiments: Array Formatting

- **Status:** Not linted by design.
- **History:** The rules `array-bracket-newline` and `array-element-newline` were briefly introduced and subsequently hard-reverted.
- **Tooling Limitation:** Both native ESLint rules only evaluate the layout if an *individual element* spans multiple lines (such as a nested object literal). They do not evaluate layouts based on the total horizontal character footprint of the complete array. ESLint lacks a Prettier-style "wrap lines only if they exceed length boundaries" automated mechanism.
- **Outcome:** Enforcing these rules caused compact arrays like `['null', 'object', 'array']` to forcefully split onto separate lines for no practical readability gain, while simultaneously allowing massive single-line arrays to collapse past the margins if their individual elements remained short.
- **Guidance:** Horizontal array limits remain checked via the global `max-len` rule. Breaking long arrays into readable, one-element-per-line chunks is a human/AI stylistic decision, handled identically to the `max-len` template literal bypasses.

## Known Gaps & Future Implementations

### Import-Priority Sorting

- **Status:** Requested but not yet specified or implemented.
- **Target Requirements:** Needs to group, prioritize, and structure layout blocks separating default imports, mixed assignments, glob symbols, explicit named exports, and multiline-named imports. A secondary alphabetical or semantic sort key must also be established to organize symbols within each isolated group.
