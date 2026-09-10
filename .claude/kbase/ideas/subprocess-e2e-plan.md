# Refactor plugin to codegen + subprocess E2E tests

## Context

The current plugin uses `require()` + stack trace detection to find and load route files per `createApp()` call. This works but is fragile (stack trace parsing) and maintains two code paths (require for runtime, codegen for future build). By restructuring E2E tests to run the app as a subprocess, we can switch to pure codegen via `onLoad`, eliminating the stack trace hack and `require()` path entirely.

## Changes

### 1. Build `createServer()` helper

New file: `tests/helpers/create-server.ts`

```typescript
type ServerHandle = {
  port: number
  output: string[]
  kill: () => Promise<void>
}

async function createServer (testDir: string): Promise<ServerHandle>
```

Implementation:
- Resolves entrypoint at `path.join(testDir, 'src', 'index.ts')`
- Spawns `Bun.spawn(['bun', '--preload', 'sleepy-serv/plugin', 'run', entrypoint], { cwd: testDir, stdout: 'pipe', stderr: 'inherit' })`
- Reads stdout in background, pushing lines to `output` array
- Waits for `PORT:<number>` line to resolve the port (with timeout)
- `kill()` sends SIGTERM and awaits `proc.exited`

### 2. Refactor plugin to pure codegen

**Remove** `packages/server/src/plugin/builder.ts` (the `require()`-based builder).

**Rewrite** `packages/server/src/plugin/index.ts`:
- Load config, resolve `apiRoot` (default: `path.resolve(cwd, './src/api')`)
- Register `Bun.plugin()` with `onLoad` matching the barrel file path
- `onLoad` callback: scan `apiRoot`, run codegen, return generated module
- The generated module uses relative imports (`./core`) since Bun resolves them relative to the intercepted file's location

The `onLoad` filter uses `require.resolve('sleepy-serv')` to get the exact barrel path, then builds a regex from it.

**Update** `packages/server/src/plugin/codegen.ts`:
- Add `generateBarrelModule(scanResult, corePath)` that produces a single module:
  - `export * from './core'` (re-exports all types, errors, etc.)
  - Static `import` statements for all handler and meta files
  - Runtime default-export validation
  - Chain normalization and meta composition
  - `export function createApp(port, opts)` wrapper with routes pre-bound

**Simplify** `packages/server/src/index.ts`:
- Remove `setRoutes()`, `_pluginRoutes`, `getCallerDirectory()`, `buildRouteConfig` import
- Back to a simple re-export: `export * from './core'` plus the raw `createApp` re-export
- Without the plugin, `createApp(port, opts)` throws a clear error (no routes available)

### 3. Update `app.root` default

In `packages/server/src/plugin/config.ts`, the default `apiRoot` when no config is found:
```typescript
path.resolve(process.cwd(), config.app?.root ?? './src/api')
```

This matches the scaffolded project structure (`src/api/`) and the test directory layout.

### 4. Restructure E2E test directories

Each test directory gains a `src/` subdirectory mimicking a consumer project:

**Current:**
```
tests/request/route-static/
  api/users/get.ts
  integration.test.ts
```

**New:**
```
tests/request/route-static/
  src/
    index.ts          # import { createApp } from 'sleepy-serv'; createApp(0); console.log PORT
    api/users/get.ts
  integration.test.ts # spawns src/index.ts via createServer()
```

The `src/index.ts` entry point for each test:
- Imports `createApp` from `sleepy-serv`
- Calls `createApp(0, opts)` with any test-specific options
- Logs `PORT:<number>` to stdout
- For callback tests, logs callback invocations (e.g., `CLOSED`, `OPENED:<clientId>`)

### 5. Refactor E2E test helpers

**Rename** `createRequestor` to `createClient`. Takes a `ServerHandle` instead of `App` or port:

```typescript
export function createClient (server: ServerHandle): Client
```

Internally builds URLs from `http://localhost:${server.port}`.

Variable naming convention changes across all E2E tests:
- `req` -> `client`
- `res` -> `result`

Remove unused imports (`createApp`, `App`, etc.) since tests no longer import these.

### 6. Update all E2E tests

Pattern for each test:

```typescript
import { createServer } from '../../helpers/create-server'
import { Fmt, createClient } from '../../helpers'

test('when making a request on a static route', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/users', Fmt.Json)

  expect(result.status).toBe(200)

  expect(result.body).toStrictEqual([
    {
      id: 1,
      firstName: 'Tony',
      lastName: 'Stark',
      email: 'tony.stark@starkindustries.com',
    },
  ])

  await server.kill()
})
```

For WebSocket tests:
```typescript
test('when connecting via WebSocket', async () => {
  const server = await createServer(import.meta.dirname)
  const client = await SleepySocketClient.open(
    'localhost',
    server.port,
  )

  const result = await client.get('/users')

  expect(result.status).toBe(200)

  await client.close()
  await server.kill()
})
```

For callback tests:
```typescript
test('when the app is closed', async () => {
  const server = await createServer(import.meta.dirname)
  // ... trigger close ...

  await server.kill()
  expect(server.output).toContain('CLOSED')
})
```

### 7. Update package-level integration tests

Same pattern as E2E tests. Each test directory in `packages/server/tests/` gets:
- `src/index.ts` entry point
- `src/api/` route fixtures (moved from `api/`)

Tests use `createServer()` and `createClient(server)`.

### 8. Remove dead code

After all tests are migrated:
- Remove `builder.ts` (require-based builder)
- Remove stack trace detection from `src/index.ts`
- Remove `setRoutes()` and `_pluginRoutes` from `src/index.ts`
- Remove `./plugin/builder` from `package.json` exports

### Files modified

**New:**
- `tests/helpers/create-server.ts`
- `*/src/index.ts` in each test directory (~66 entry points)

**Modified:**
- `packages/server/src/index.ts` -- simplified to re-export + error
- `packages/server/src/plugin/index.ts` -- onLoad + codegen
- `packages/server/src/plugin/codegen.ts` -- add generateBarrelModule
- `packages/server/src/plugin/config.ts` -- update default root
- `tests/helpers.ts` -- rename createRequestor to createClient, takes ServerHandle
- `packages/server/tests/helpers.ts` -- rename createRequestor to createClient, takes ServerHandle
- All ~66 integration + E2E test files

**Removed:**
- `packages/server/src/plugin/builder.ts`

**Moved (within each test directory):**
- `api/` -> `src/api/`

### Verification

- `bun test` from repo root -- all tests pass
- `bunx eslint .` -- clean
- `bun run --filter sleepy-serv typecheck` -- clean
- Manual: verify a test's `src/index.ts` works standalone with `bun --preload sleepy-serv/plugin run tests/request/route-static/src/index.ts`

### Implementation order

1. Build `createServer()` helper
2. Rewrite plugin to onLoad + codegen
3. Simplify `src/index.ts` barrel
4. Convert one test as proof of concept (e.g., `tests/request/route-static`)
5. Verify proof of concept passes
6. Migrate remaining E2E tests
7. Migrate package-level integration tests
8. Remove dead code (builder.ts, stack trace, setRoutes)
9. Final verification
