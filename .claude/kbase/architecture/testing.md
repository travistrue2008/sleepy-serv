# Testing

## Test styles

- **Unit tests** colocated in `packages/server/src/` and `packages/client/src/` (`*.test.js`).
- **Server integration tests** in `packages/server/tests/<category>/<case>/integration.test.js`, each with a real `api/` fixture. Every test boots its own app with `createApp(0, import.meta.dirname, opts)` and tears down with `app.server.stop(true)`. Requests go through the functional helpers in `packages/server/tests/helpers.js` (see [Server integration helpers](#server-integration-helpers)), not raw `fetch`.
- **Root-level E2E tests** in `tests/src/<category>/<case>/integration.test.js`: a real `sleepy-serv` server and a real `sleepy-socket` client over an actual loopback WebSocket, booted via `boot()` / `createServer` / `createSocketClient` in `tests/src/helpers.js` (port `0` for an OS-assigned ephemeral port). Raw handshake driving uses `postSession` / `putSession`, `makeRequest(port, method, route, opts)` issues a plain REST call and returns `{ status, body }` (body deserialized per `opts.type`, default `json`), and `waitFor(predicate)` polls real-timer events like a reconnect swapping in a new socket.

## Server integration helpers

`packages/server/tests/helpers.js` exposes function factories instead of the old `Context` class (the class was removed 2026-07-16 once every suite migrated):

- `createRequestor(app)` for REST: `req.get/put/post(route, fmt, opts)` returns `{ status, body }`. `fmt` is `FMT.TEXT` / `FMT.JSON`, and the body is deserialized with `res[fmt]()`. Per-call `opts` carries `query` and `mountPath`.
- `createSocketClient(app, opts)` for WebSocket: runs the POST-ticket, connect, and welcome handshake, then exposes `ws.get/put/post(route, opts)`, `heartbeat()`, `sendRaw(payload)`, plus `clientId` / `token` / `socket` getters. ws responses are asserted on `msg.status` / `msg.body`.

Naming convention across suites: `app` + `req` + `res` for REST, `app` + `ws` + `msg` for ws. Most endpoints are tested twice, once per transport, with a `(REST)` / `(ws)` suffix on the test name.

Two non-obvious rules:

- **`sendRaw(payload)` is the only way to test message-schema validation.** The ergonomic `get/put/post` and `heartbeat` always inject a valid `id`, `clientId`, `type`, and `timestamp`, so a malformed frame (a missing or invalid field) cannot be expressed through them. The `errors/request/ws-message` suite drives every validation case through `sendRaw`.
- **`mountPath` is a per-call `opts` field, not a positional arg.** `createRequestor().post(route, fmt, opts)` takes three arguments; a fourth is silently dropped. So `createSocketClient` forwards the mount path as `req.post('/ws', FMT.JSON, { mountPath })` for the ticket POST to reach the mounted `/ws`, and the ws message `route` must still include the mount prefix.

See also [Testing Patterns](../guides/testing-patterns.md) for timer and mocking conventions.

## Timers

Fake timers are **not** global. `test-setup.js` (root preload) gates `jest.useFakeTimers()` + `setSystemTime(EPOCH)` on `Bun.main` starting with `/packages`, so package unit/integration tests get the frozen clock while root `tests/**` E2E run on **real** timers. E2E tests therefore use small server/client thresholds (~100ms) instead of advancing a fake clock.
