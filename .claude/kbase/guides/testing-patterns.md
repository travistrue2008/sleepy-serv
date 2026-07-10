# Testing Patterns

## Time

- `test-setup.js` (repo root, preloaded via `bunfig.toml`) globally wraps every test in
  `jest.useFakeTimers()` + `setSystemTime(EPOCH)` (`beforeEach`) and resets both
  (`afterEach`). Individual tests don't need their own timer setup/teardown — just call
  `jest.advanceTimersByTime(ms)` directly to fast-forward.
- Bun's `bun:test` exposes Jest-compatible fake timer APIs (`jest.useFakeTimers`,
  `jest.advanceTimersByTime`, `jest.runAllTimers`, etc.) via its `jest` export.

## Mocking over real infra, when reasonable

Prefer a hand-built mock over standing up real infrastructure when the real thing would add
flakiness or complexity without proving anything extra — e.g. `packages/client/src/index.test.js` mocks the
`WebSocket` global (`MockWebSocket`) rather than booting a real `Bun.serve()` WS server, since the
client's own logic (registry, queueing, timeouts) doesn't depend on real network behavior. Real
servers/sockets are still the right call for true end-to-end tests that specifically verify
client↔server wire compatibility.
