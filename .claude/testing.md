# Writing tests

Guidelines for tests in this repo, on top of what's already in `CLAUDE.md`'s "Tests" section.
Applies to both unit tests (colocated `*.test.js`) and integration tests
(`server/tests/<category>/<case>/integration.test.js`).

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

## Time

- `test-setup.js` (repo root, preloaded via `bunfig.toml`) globally wraps every test in
  `jest.useFakeTimers()` + `setSystemTime(EPOCH)` (`beforeEach`) and resets both
  (`afterEach`). Individual tests don't need their own timer setup/teardown — just call
  `jest.advanceTimersByTime(ms)` directly to fast-forward.
- Bun's `bun:test` exposes Jest-compatible fake timer APIs (`jest.useFakeTimers`,
  `jest.advanceTimersByTime`, `jest.runAllTimers`, etc.) via its `jest` export.

## Mocking over real infra, when reasonable

Prefer a hand-built mock over standing up real infrastructure when the real thing would add
flakiness or complexity without proving anything extra — e.g. `client/src/index.test.js` mocks the
`WebSocket` global (`MockWebSocket`) rather than booting a real `Bun.serve()` WS server, since the
client's own logic (registry, queueing, timeouts) doesn't depend on real network behavior. Real
servers/sockets are still the right call for true end-to-end tests that specifically verify
client↔server wire compatibility.
