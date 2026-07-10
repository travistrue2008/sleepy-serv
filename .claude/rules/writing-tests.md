---
paths:
  - "**/*.test.js"
---

# Writing tests

Guidelines for tests in this repo, on top of what's already in `CLAUDE.md`. Applies to both
unit tests (colocated `*.test.js`) and integration tests
(`packages/server/tests/<category>/<case>/integration.test.js`).

## Structure

- Follow **AAA** (Arrange, Act, Assert) within each `test()` body.
- `describe()` is named after the unit under test, with parens as if calling it:
  - `describe('createMessage()')` for a plain function.
  - `describe('.connect()')` for a static method (leading dot, no class name).
  - `describe('send()')` for an instance method (no leading dot).
- Every `test()` name starts with `"when …"`, describing the triggering condition/scenario, e.g.
  `test('when the queue is empty', ...)`.
- Write and order **failure cases before success cases** within a `describe()` block.

## Assertions

- Prefer `.toHaveBeenCalledOnce()` over `.toHaveBeenCalledTimes(1)`.
- For whole-object assertions, use `expect(actual).toStrictEqual({...})` with the full expected
  shape spelled out, rather than checking individual fields piecemeal.
- When an object contains a generated/non-deterministic field (e.g. a uuid `id`), echo the actual
  value back into the expected object (`id: actual.id`) instead of asserting on it separately —
  this keeps `toStrictEqual` exact everywhere else without fighting randomness.

## References

- For detailed architecture regarding unit, integration, and E2E setups, see `@./claude/docs/architecture/testing.md`.
- For guidelines on fake timers and mocking philosophy, see `@./claude/docs/guides/testing-patterns.md`.
