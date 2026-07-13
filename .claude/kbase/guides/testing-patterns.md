# Testing Patterns

## Time

- `test-setup.js` (repo root, preloaded via `bunfig.toml`) wraps tests in
  `jest.useFakeTimers()` + `setSystemTime(EPOCH)` (`beforeEach`) and resets both
  (`afterEach`), but **only** for files whose `Bun.main` path starts with `/packages`.
  Package unit/integration tests thus get the frozen clock; root `tests/**` E2E run on
  real timers. Bun has no directory-scoped hooks, so this per-file gate on `Bun.main`
  (which resolves to the running test file under `bun test`) is the mechanism.
- Package tests fast-forward with `jest.advanceTimersByTime(ms)`. E2E tests instead use
  small real thresholds (server `ws.disconnectThreshold` / `heartbeatInterval`, client
  `timeout` / `reconnect.minDelay`, around 100ms) plus `waitFor()` from
  `tests/src/helpers.js` to await genuine wall-clock events.
- Bun's `bun:test` exposes Jest-compatible fake timer APIs (`jest.useFakeTimers`,
  `jest.advanceTimersByTime`, `jest.runAllTimers`, etc.) via its `jest` export.

## Mocking over real infra, when reasonable

Prefer a hand-built mock over standing up real infrastructure when the real thing would add
flakiness or complexity without proving anything extra — e.g. `packages/client/src/index.test.js` mocks the
`WebSocket` global (`MockWebSocket`) rather than booting a real `Bun.serve()` WS server, since the
client's own logic (registry, queueing, timeouts) doesn't depend on real network behavior. Real
servers/sockets are still the right call for true end-to-end tests that specifically verify
client↔server wire compatibility.
