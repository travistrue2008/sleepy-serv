# Testing

## Test styles

- **Unit tests** colocated in `packages/server/src/core/` and `packages/client/src/` (`*.test.ts`). Plugin unit tests in `packages/server/src/plugin/` (`scanner.test.ts`, `codegen.test.ts`, `config.test.ts`).
- **Server integration tests** in `packages/server/tests/<category>/<case>/integration.test.ts`. Each test directory mimics a consumer project with `src/index.ts` (entrypoint) and `src/api/` (route fixtures). Tests spawn the app as a subprocess via `createServer(import.meta.dirname)`, make HTTP/WebSocket requests from the outside, and assert on responses and stdout output.
- **Root-level E2E tests** in `tests/<category>/<case>/e2e.test.ts`. Same subprocess model as integration tests, but exercises the full stack with `sleepy-socket` client. This suite proves the two packages meet over the wire.

## Subprocess model

All integration and E2E tests run the server in a subprocess. Each `test()` call spawns its own server for isolation.

**Test directory layout** (mimics a consumer project):
```
tests/request/route-static/
  src/
    index.ts        # import { createApp } from 'sleepy-serv'; createApp(0)
    api/
      users/get.ts  # route handler
  e2e.test.ts       # spawns src/index.ts via createServer()
```

The subprocess runs with `bun --preload sleepy-serv/plugin src/index.ts`. The plugin's `onLoad` hook intercepts the `sleepy-serv` import and injects codegen'd routes via static imports. The server logs `Running on port: <N>` to stdout; `createServer()` parses this to discover the assigned port.

**Why subprocesses**: The plugin uses `Bun.plugin()` with `onLoad` to intercept and replace the `sleepy-serv` barrel at load time. `onLoad` results are cached per file path per process, so a single process can only serve one set of routes. Each test directory has different route fixtures, so each needs its own process with a fresh module cache.

## Helpers

Both `packages/server/tests/helpers.ts` and `tests/helpers.ts` provide the same core functions:

- `createServer(testDir)` spawns the subprocess, waits for the port, captures stdout, returns `{ port, output, kill() }`. Rejects if the subprocess exits before printing a port (e.g., scanner validation errors).
- `createClient(source)` for REST: `client.get/put/post(route, fmt, opts)` returns `{ status, body }`. Takes any object with `port`.
- `createSocketClient(source, opts)` (server helpers only) for raw WebSocket: runs POST-ticket + connect + welcome, returns `ws.get/put/post`, `heartbeat()`, `sendRaw()`.
- `waitFor(predicate)` polls on real timers until truthy or timeout.
- `wait(ms)` simple delay.

The E2E helpers also provide `createWsClients(server, opts)` for multi-client scenarios, `listenForNotifications(clients)`, `listenForClose(clients)`, `closeWsClients(clients)`, and `getAdminPort(server)`.

**Variable naming**: `server` for the subprocess handle, `client` for the HTTP requestor, `wsClient` for WebSocket client, `result` for HTTP responses.

## Server-side command testing

`app.ws.send()`, `app.ws.broadcast()`, `app.ws.drop()`, and `app.ws.query()` can't be called from outside the subprocess. Two patterns solve this:

- **Trigger routes**: Add HTTP endpoints in `src/api/` that invoke `req.ws.*` from a handler or middleware. The test hits the trigger route via `fetch()`, then asserts on the WebSocket client's received messages.
- **Admin server**: For `app.ws.*` commands (which need the `app` reference), `src/index.ts` spins up a secondary `Bun.serve()` on port 0 with routes that call `app.ws.broadcast()` etc. The test discovers the admin port from `ADMIN_PORT:<N>` in stdout via `getAdminPort(server)`.

## Callback testing

Server-side callbacks (`onClose`, `onOpen`) are defined in `src/index.ts` and log to stdout. Tests assert on `server.output`:

```typescript
// src/index.ts
const app = createApp(0, {
  ws: {
    onClose: (clientId, reason) => {
      console.log(`CLOSE:${clientId}:${reason}`)
    },
  },
})

// test
await waitFor(() =>
  server.output.filter(l => l.startsWith('CLOSE:')).length >= 1,
)
```

Wait for the output to appear before `server.kill()`, since the subprocess may not have flushed stdout yet.

## Coverage

Bun does not support code coverage for subprocesses ([oven-sh/bun#17867](https://github.com/oven-sh/bun/issues/17867)). `NODE_V8_COVERAGE` is recognized but does not write files, and `v8.takeCoverage()` is not implemented (Bun 1.4.0). Coverage for plugin code comes from the in-process unit tests (`scanner.test.ts`, `codegen.test.ts`, `config.test.ts`). Integration/E2E tests provide behavioral verification without line-level coverage reporting.

## Timers

Fake timers are **not** global. `test-setup.ts` (root preload) gates `jest.useFakeTimers()` + `setSystemTime(EPOCH)` on `Bun.main` starting with `/packages`, so package unit/integration tests get the frozen clock while root `tests/**` E2E run on **real** timers. E2E tests therefore use small server/client thresholds (~100ms) instead of advancing a fake clock.

Note: subprocess servers always run on real timers regardless of the test runner's timer mode, since they are separate processes.

See also [Testing Patterns](../guides/testing-patterns.md) for timer and mocking conventions.
