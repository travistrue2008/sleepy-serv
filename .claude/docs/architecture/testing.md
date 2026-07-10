# Testing

## Test styles

- **Unit tests** colocated in `packages/server/src/` and `packages/client/src/` (`*.test.js`).
- **Server integration tests** in `packages/server/tests/<category>/<case>/integration.test.js`, each with a real `api/` fixture booted via `createApp` and hit with `fetch`. Get a unique port from `getPortCounter()` in `packages/server/tests/_helpers.js`.
- **Root-level E2E tests** in `tests/<category>/<case>/integration.test.js` — a real `sleepy-serv` server and a real `sleepy-socket` client over an actual loopback WebSocket, booted via `boot()` in `tests/_helpers.js` (port `0` for an OS-assigned ephemeral port).
