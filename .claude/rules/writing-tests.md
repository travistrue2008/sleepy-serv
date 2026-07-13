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
- `describe()` block usage:
  - Use to group tests for functions, classes, and class methods
  - Avoid using for high-level tests (such as E2E tests)
  - Class methods (static and instance) get a nested `describe()` block
  - Function/instance method example: `describe('createMessage()')`
  - Static method example: `describe('.connect()')` (leading dot, no class name)
- Every `test()` name starts with `"when …"`
  - Test labels to describe the triggering condition/scenario (the "cause")
  - Assertions will articulate the expected "effect"
  - Example: `test('when the queue is empty', ...)`
- Write and order **failure cases before success cases** within a `describe()` block.
- Avoid mixing the _Act_ and _Assert_ phases where possible
- Don't write helper functions that mix _Act_ and _Assert_ phases
- When testing functions that should throw an error
  - If synchronous:
    1. Wrap the function call into a variable called `fn`
    2. Pass `fn` into `expect()`
  - If asynchronous:
    1. Call the function, assign return value to a variable called `promise`
    2. Pass `promise` into `await expect()`

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
