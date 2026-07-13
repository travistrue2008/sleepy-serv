# Testing

## Test styles

- **Unit tests** colocated in `packages/server/src/` and `packages/client/src/` (`*.test.js`).
- **Server integration tests** in `packages/server/tests/<category>/<case>/integration.test.js`, each with a real `api/` fixture booted via `createApp` and hit with `fetch`. Get a unique port from `getPortCounter()` in `packages/server/tests/_helpers.js`.
- **Root-level E2E tests** in `tests/src/<category>/<case>/integration.test.js`: a real `sleepy-serv` server and a real `sleepy-socket` client over an actual loopback WebSocket, booted via `boot()` / `createServer` / `createSocketClient` in `tests/src/helpers.js` (port `0` for an OS-assigned ephemeral port). Raw handshake driving uses `postSession` / `putSession`, and `waitFor(predicate)` polls real-timer events like a reconnect swapping in a new socket.

## Timers

Fake timers are **not** global. `test-setup.js` (root preload) gates `jest.useFakeTimers()` + `setSystemTime(EPOCH)` on `Bun.main` starting with `/packages`, so package unit/integration tests get the frozen clock while root `tests/**` E2E run on **real** timers. E2E tests therefore use small server/client thresholds (~100ms) instead of advancing a fake clock.
