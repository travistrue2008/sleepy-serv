# Testing Patterns

For test styles, the boot model, and the server integration helpers, see [Testing](../architecture/testing.md).

## Time

- `test-setup.ts` (repo root, preloaded via `bunfig.toml`) wraps tests in
  `jest.useFakeTimers()` + `setSystemTime(EPOCH)` (`beforeEach`) and resets both
  (`afterEach`), but **only** for files whose `Bun.main` path starts with `/packages`.
  Package unit/integration tests thus get the frozen clock; root `tests/**` E2E run on
  real timers. Bun has no directory-scoped hooks, so this per-file gate on `Bun.main`
  (which resolves to the running test file under `bun test`) is the mechanism.
- Package tests fast-forward with `jest.advanceTimersByTime(ms)`. E2E tests instead use
  small real thresholds (server `ws.dropThreshold` / `heartbeatInterval`, client
  `timeout` / `reconnect.minDelay`, around 100ms) plus `waitFor()` from
  `tests/src/helpers.js` to await genuine wall-clock events.
- Bun's `bun:test` exposes Jest-compatible fake timer APIs (`jest.useFakeTimers`,
  `jest.advanceTimersByTime`, `jest.runAllTimers`, etc.) via its `jest` export.

## Mocking over real infra, when reasonable

Prefer a hand-built mock over standing up real infrastructure when the real thing would add
flakiness or complexity without proving anything extra, e.g. `packages/client/src/index.test.js` mocks the
`WebSocket` global (`MockWebSocket`) rather than booting a real `Bun.serve()` WS server, since the
client's own logic (registry, queueing, timeouts) doesn't depend on real network behavior. Real
servers/sockets are still the right call for true end-to-end tests that specifically verify
client↔server wire compatibility.

## Bun `server.stop()` after server-initiated WebSocket close

`server.stop()` returns a `Promise<void>` that resolves once every connection
has closed. In Bun 1.3.14, this promise never resolved after a server-initiated
`ServerWebSocket.close()` call (reaper, supersede, or `commands.drop()`). Bun's
internal connection tracking failed to deregister server-initiated closures, so
`stop()` waited forever for connections it thought were still open. Client-initiated
closes were unaffected. This was Bun bug
[#36223](https://github.com/oven-sh/bun/issues/36223), fixed in Bun 1.4.0.

In E2E tests that trigger server-initiated closes (close-reaped, close-superseded,
disconnect), `app.close(true)` is called without `await` as a workaround. Tests
that only use client-initiated closes (close-willing, close-dropped) can safely
`await app.close(true)`.

## Bun 1.4.0: async close events

Bun 1.4.0 fires the client-side WebSocket `close` event asynchronously after
`socket.close()` is called, unlike 1.3.14 which fired it synchronously. This means
`client.isConnected` may still be `true` immediately after `socket.close()`. E2E
tests that need to wait for a disconnect-then-reconnect cycle should check for the
socket reference changing (`client.socket !== oldSocket`) or wait for
`!client.isConnected` first, rather than assuming the close has already happened.

## Isolation across the shared process

The whole suite runs in one Bun process, so module singletons and globals are shared; package unit
tests and root E2E tests that import the real client touch the same state. A unit test that mutates
shared state and fails to restore it leaks into every file that runs afterward. Two rules:

- **Mock globals with `spyOn(obj, 'method')`, never direct assignment.** `mock.restore()` only reverts
  `spyOn` spies; a plain `crypto.randomUUID = mock()` is never undone, so the clobbered global bleeds
  into later files.
- **Reset module singletons in `afterEach`.** `setIdGenerator()` (client `utils.js`, see
  [Real-time / WebSocket Layer](../architecture/websocket.md)) mutates a module-level generator; a test
  that sets it must restore the default (`setIdGenerator(() => crypto.randomUUID())`).

Symptom of either leak: unrelated E2E tests hang to their timeout because the client emits id-less
frames the server rejects with `must have required property 'id'`.
