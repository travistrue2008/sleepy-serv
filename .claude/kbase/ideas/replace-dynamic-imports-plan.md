# Replace Dynamic Imports with Bun Plugin + CLI

## Context

`createApp(port, rootPath, opts)` dynamically scans `${rootPath}/api` at runtime and uses `import()` to load route files. This prevents `bun build --compile --bytecode` (bundler can't resolve runtime-computed paths), creates a minor security surface, and adds startup latency. The fix: move filesystem scanning to a Bun plugin that runs at load/build time, generating static imports. Add a CLI (`sleepy`) for dev/build workflows and a config file (`sleepy.config.ts`).

## PR Strategy

| PR | Phases | What ships |
|---|---|---|
| PR 1 | Phase 1 + 2 | Document meta bug + move source to `core/`. No logic changes. |
| PR 2 | Phase 3 + 4 + type exports | Core refactor + plugin + package exports. Working end-to-end. |
| PR 3 | Phase 5 | CLI (`sleepy init/dev/build`) + `sleepy.config.ts` loading |
| PR 4 | Phase 6 (remaining) | Kbase documentation updates |

Phase 3 and 4 must ship together: Phase 3 alone breaks the public API without the plugin that restores the DX.

## Architecture

### Package structure (all within `sleepy-serv`)

| Entry point | Purpose |
|---|---|
| `sleepy-serv/core` | Raw API: `createApp(port, config, opts?)`. No plugin, no scanning. |
| `sleepy-serv` | Same source as core. Plugin intercepts this import and wraps `createApp`. |
| `sleepy-serv/plugin` | Bun plugin preload. Scans filesystem, generates virtual modules. |
| CLI (`sleepy`) | `init`, `dev`, `build` commands via `package.json` `bin` field. |

### Consumer experience

```typescript
import { createApp } from 'sleepy-serv'
createApp(3000, { middleware: [cors()] })
```

Two args. No routes. No virtual module import. Filesystem convention preserved.

### Config file: `sleepy.config.ts` (or `.js`)

```typescript
export default {
  app: {
    root: './src/api',            // default: './api'
    entrypoint: './src/index.ts', // default: './src/index.ts'
  },
  build: {
    compile: false,               // true | cross-compile target string
    bytecode: false,
    outdir: './dist',
    plugins: [],                  // additional Bun plugins
  },
}
```

### CLI

```
sleepy init    # scaffold new project
sleepy dev     # watch mode + plugin
sleepy build   # Bun.build() + plugin + config
```

---

## Phase 1: Document meta path matching bug

**Goal**: Document an existing bug in `selectMetaPaths` with reproduction steps and test cases. Create `.claude/todos/meta-path-false-positive.md`.

Create `.claude/todos/meta-path-false-positive.md`. The current `selectMetaPaths` uses simple string `startsWith` to match meta middleware to routes. This produces false matches when one directory name is a prefix of a sibling directory name.

**Bug**: `selectMetaPaths` matches `meta.ts` files whose `path.dirname` is a string prefix of the module path, not a directory ancestor.

**Fixture to reproduce** (`packages/server/tests/errors/request/meta-false-match/`):

```
api/
  w/
    meta.ts       # exports middleware: pushes 'w-meta' onto res.list
    get.ts        # handler: returns res.list joined
  ws/
    get.ts        # handler: returns res.list joined
```

`api/w/meta.ts`:
```typescript
export const middleware = [
  (_req, res, next) => next({ ...res, list: [...(res?.list ?? []), 'w-meta'] }),
]
```

`api/w/get.ts`:
```typescript
export default (req, res) => new Response((res?.list ?? []).join('|'))
```

`api/ws/get.ts`:
```typescript
export default (req, res) => new Response((res?.list ?? []).join('|'))
```

**Package-level test** (`integration.test.ts`):
```typescript
test('when a sibling directory name is a string prefix (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)

  const wRes = await req.get('/w', Fmt.Text)
  const wsRes = await req.get('/ws', Fmt.Text)

  await app.close(true)

  // /w should get w/meta.ts middleware
  expect(wRes.body).toBe('w-meta')

  // /ws should NOT get w/meta.ts middleware (bug: it currently does)
  expect(wsRes.body).toBe('')
})
```

This test currently FAILS because `selectMetaPaths` matches `api/w/meta.ts` against `api/ws/get.ts` via `'api/ws/get.ts'.startsWith('api/w')` = `true`.

**E2E test** (`tests/meta-false-match/`):

Same fixture structure. Test imports from `sleepy-serv` (not `../src`):
```typescript
test('when a sibling directory is a string prefix of another (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)

  const wsRes = await req.get('/ws', Fmt.Text)

  await app.close(true)

  // /ws must not inherit middleware from /w/meta.ts
  expect(wsRes.body).toBe('')
})
```

**Fix** (for the future): Replace `startsWith` with segment-aware matching:
```typescript
// Current (buggy):
modulePath.startsWith(path.dirname(metaPath))

// Fixed:
const dir = path.dirname(metaPath) + '/'
modulePath.startsWith(dir)
```

Or in the new `MetaEntry`-based matching:
```typescript
entry.path === '/' ||
socketRoutePath === entry.path ||
socketRoutePath.startsWith(entry.path + '/')
```

---

## Phase 2: Move implementation to `core` subdirectory

**Goal**: Establish the `src/core/` directory structure. Pure file move, no logic changes. All tests pass without modification.

### Move source files

Move all non-test `.ts` files from `packages/server/src/` to `packages/server/src/core/`:

- `index.ts` -> `core/index.ts`
- `utils.ts` -> `core/utils.ts`
- `errors.ts` -> `core/errors.ts`
- `socket.ts` -> `core/socket.ts`
- `middleware.ts` -> `core/middleware.ts`
- `messages.ts` -> `core/messages.ts`

Internal relative imports between these files (e.g., `import from './utils'`) stay valid since they move together.

### Create barrel re-exports at original locations

Colocated test files (`socket.test.ts`, `errors.test.ts`) import from relative paths like `./socket`. Barrel files at the original locations keep those imports working:

- `src/index.ts`: `export * from './core'`
- `src/utils.ts`: `export * from './core/utils'`
- `src/errors.ts`: `export * from './core/errors'`
- `src/socket.ts`: `export * from './core/socket'`
- `src/middleware.ts`: `export * from './core/middleware'`
- `src/messages.ts`: `export * from './core/messages'`

### Update `package.json` exports

Add `./core` entry pointing to `src/core/index.ts`. The `.` entry stays pointing to `src/index.ts` (barrel).

### Verification

- `bun test` from repo root -- all tests pass unchanged
- `bunx eslint .` -- clean

---

## Phase 3: Refactor `createApp` in core

**Goal**: Decouple `createApp` from filesystem scanning. Make it synchronous, accepting pre-built routes.

### New types in `packages/server/src/utils.ts`

```typescript
export type RouteDefinition = {
  method: HttpMethod
  path: string
  chain: Handler | MiddlewareChain
}

export type MetaEntry = {
  path: string          // route path, e.g. '/' or '/users'
  middleware: Middleware[]
}

export type RouteConfig = {
  routes: RouteDefinition[]
  meta?: MetaEntry[]    // for socket-route meta middleware resolution
}
```

Export these from `packages/server/src/index.ts`.

### `createApp` signature change

```typescript
// Before
export async function createApp(port: number, rootPath: string, opts?: AppOptions): Promise<App>

// After
export function createApp(port: number, config: RouteConfig, opts?: AppOptions): App
```

Synchronous. `config.routes[].chain` contains meta + module middleware (NOT app-level). `createApp` prepends `opts.middleware` to each chain internally.

### Remove from `packages/server/src/index.ts`

- Imports: `fs`, `path`
- Types: `DirEntry`, `RoutePath`, `RoutingOptions`
- Constants: `ALLOWED_FILES_META`, `ALLOWED_FILES_METHODS`
- Functions: `validateLeafDirectory`, `validateDirectory`, `getAllFilePathsRec`, `getFilteredFilePaths`, `getMethodFilePaths`, `getMetaFilePaths`, `selectMetaPaths`, `resolveMetaMiddleware`, `buildRoutePaths`, `buildChain`, `buildNormalRoutes`
- `ChainRoute` type (superseded by `RouteDefinition`)

### Simplify `buildRoutes`

Now synchronous. Receives `RouteConfig` instead of scanning. Two preprocessing steps before the existing pipeline:

1. **Normalize chains**: Each route's `chain` may be `Handler | MiddlewareChain`. Normalize single handlers to `[handler]` (replaces the `Array.isArray(module.default)` check from the old `buildChain`).
2. **Prepend `opts.mountPath`**: The plugin generates routes without mountPath (it's in `opts`, not config). `buildRoutes` prepends `opts.mountPath` to each route's `path` (replaces what `buildRoutePaths` used to do).
3. **Prepend `opts.middleware`**: App-level middleware is prepended to each normalized chain.

Then runs the existing pipeline: `buildMergedRoutes` -> `buildSocketRoutes` -> `buildModuleRoutes` -> `buildServerRoutes` -> `buildOutputRoutes`.

### Simplify `buildMergedRoutes`

Now synchronous. For socket-only endpoints (no consumer overlap), uses `config.meta` instead of dynamic meta resolution:

```typescript
const metaMiddleware = (config.meta ?? [])
  .filter(entry => socketRoutePath.startsWith(entry.path))
  .sort((a, b) => a.path.length - b.path.length)
  .flatMap(entry => entry.middleware)
```

Remove the `RoutingOptions` parameter. Remove the `basePath`/`metadata` usage.

### Keep unchanged

`buildEndpointRequest`, `methodNotAllowedHandler`, `defaultMethodMap`, `buildSocketRoutes`, `buildModuleRoutes`, `buildServerRoutes`, `buildOutputRoutes`, `buildServer`, `processIO`. All exports (types, errors, middleware).

### Update package-level tests

Deferred to Phase 3 (plugin). Package-level integration tests will use the plugin, not `sleepy-serv/core`, since they test the package from a user-facing perspective. The test changes are minimal once the plugin exists: remove `import.meta.dirname` and `await`.

Initialization-error tests (`leaf-directory-has-no-method-file`, `method-file-has-no-default-export`): move to plugin test suite (Phase 4).

### Verification

- `bun test packages/server/src/` -- unit tests pass (they import from core directly)
- `bunx eslint .` -- clean
- Package-level integration tests are expected to fail until Phase 4 (plugin) is complete

---

## Phase 4: Build the Bun plugin

**Goal**: Create `sleepy-serv/plugin` that scans the filesystem at load/build time, intercepts `sleepy-serv` imports, and wraps `createApp` with pre-bound routes. Update E2E tests.

### New files

```
packages/server/src/plugin/
  index.ts      # preload entry: loads config, registers Bun.plugin()
  scanner.ts    # filesystem scanning (relocated from old index.ts)
  codegen.ts    # virtual module code generation
  config.ts     # sleepy.config.ts/.js loader
```

### `scanner.ts`

Relocate the removed scanning functions from Phase 3 (`validateLeafDirectory`, `validateDirectory`, `getAllFilePathsRec`, `getFilteredFilePaths`, `getMethodFilePaths`, `getMetaFilePaths`, `selectMetaPaths`, `buildRoutePaths`). Add a top-level `scanRoutes(apiRoot)` that returns raw scan results (method files + meta files with their route paths and absolute file paths).

Directory validation (`validateLeafDirectory`) runs during the scan, catching invalid directories at load/build time.

The `no default export` check also moves here: the scanner imports each method file and validates `module.default` exists before returning the scan result. This preserves the current fail-early behavior (error at initialization, not at request time).

**Error output DX** (verified experimentally):
- **Runtime** (`bun run`): Thrown errors in `onLoad` produce clean output -- the error message with a one-line location. No noisy stack frames.
- **Build** (`Bun.build()`): Throws an `AggregateError` containing `BuildMessage` objects with the original `message` and `level` fields. The `sleepy build` CLI can catch and format these.
- **Structured errors** (`return { errors: [...] }`): NOT supported by Bun's `onLoad` -- it requires `contents`.
- **Approach**: Throw errors directly from the scanner. No special formatting needed for runtime. The CLI formats `BuildMessage` objects from the `AggregateError` for clean build output.

### `config.ts`

```typescript
export type SleepyConfig = {
  app?: { root?: string, entrypoint?: string }
  build?: { compile?: boolean | string, bytecode?: boolean, outdir?: string, plugins?: unknown[] }
}
```

Load config in the preload script (before plugin registration) to avoid re-entrancy:
```typescript
const config = await import(path.join(process.cwd(), 'sleepy.config.ts')).catch(() => ({ default: {} }))
Bun.plugin(createPlugin(config.default))
```

### `codegen.ts`

Two generators:

1. `generateRoutesModule(scanResult)` -- generates `sleepy:routes` virtual module with static import statements for all route/meta files, exports a `RouteConfig` object with chains composed (meta + module).

2. `generateWrapperModule()` -- generates `sleepy-serv` interceptor:
```javascript
export * from 'sleepy-serv/core'
import { createApp as _createApp } from 'sleepy-serv/core'
import { config } from 'sleepy:routes'
export function createApp(port, opts) { return _createApp(port, config, opts) }
```

### `index.ts` (plugin entry)

One plugin, two hook pairs:
- **Hook 1**: `onResolve`/`onLoad` for `^sleepy-serv$` -- returns the wrapper module
- **Hook 2**: `onResolve`/`onLoad` for `^sleepy:routes$` -- scans filesystem based on config `app.root` or falls back to `api/` relative to the importer. Caches per resolved root path.

The `onResolve` for `sleepy:routes` captures `args.importer` to resolve the api root relative to the importing file (enables E2E test per-directory fixture scanning).

### Package exports

`packages/server/package.json` adds `./core` and `./plugin` entries. Both `.` and `./core` point to the same source. The plugin intercepts only the `.` import.

### Update all tests (integration + E2E)

Add to root `bunfig.toml`:
```toml
[test]
preload = ["sleepy-serv/plugin"]
```

Both package-level integration tests (`packages/server/tests/`, ~26 files) and E2E tests (`tests/`, ~40 files) use the plugin. All change from `await createApp(0, import.meta.dirname)` to `createApp(0)` (or `createApp(0, { middleware: [...] })`). Plugin's importer-relative fallback scans `api/` next to each test file automatically.

The package-level integration tests use a dummy client (in `packages/server/tests/helpers.ts`). The E2E tests use the `sleepy-socket` client package. Both go through the plugin.

### Plugin tests

#### Unit tests (scanner)

- `when scanning a flat api directory` -- returns method files with correct route paths and HTTP methods
- `when scanning nested directories` -- returns correct hierarchical route paths (e.g., `/users/:userId`)
- `when a directory has a colon prefix` -- treats it as a dynamic route segment
- `when scanning finds meta.ts files` -- returns meta files with correct directory paths
- `when a leaf directory has no method file` -- throws TypeError with the directory path
- `when a method file has no default export` -- throws ReferenceError with the file path
- `when the api root directory does not exist` -- throws with clear error (not ENOENT stack)
- `when files have .js extensions` -- discovers them alongside .ts files
- `when non-method files exist in a directory` -- ignores them (only method + meta files)

#### Unit tests (codegen)

- `when generating routes module with one route` -- outputs correct static import and RouteConfig
- `when generating routes module with multiple routes` -- outputs all imports and route definitions
- `when generating routes module with meta.ts files` -- composes meta middleware into each route's chain in parent-to-child order
- `when generating routes module with nested meta.ts files` -- inner meta is composed after outer meta
- `when a handler exports an array (module-level middleware)` -- generates Array.isArray normalization
- `when generating routes module with meta files` -- includes meta array in RouteConfig for socket route parity
- `when generating wrapper module` -- re-exports from sleepy-serv/core and overrides createApp

#### Unit tests (config loader)

- `when sleepy.config.ts exists` -- loads and returns the config
- `when sleepy.config.js exists` -- loads and returns the config
- `when both .ts and .js exist` -- .ts takes precedence
- `when no config file exists` -- returns empty defaults

Partial config defaults (one test per missing property):

- `when "config" is an empty object` -- all fields use defaults
- `when "config.app" is an empty object` -- app.root and app.entrypoint use defaults
- `when "config.app.root" is "./custom/api"` -- app.entrypoint uses default
- `when "config.app.entrypoint" is "./custom/index.ts"` -- app.root uses default
- `when "config.build" is an empty object` -- all build fields use defaults
- `when "config.build.compile" is TRUE` -- bytecode, outdir, plugins use defaults
- `when "config.build.bytecode" is TRUE` -- compile, outdir, plugins use defaults
- `when "config.build.outdir" is "./custom/dist"` -- compile, bytecode, plugins use defaults
- `when "config.build.plugins" is [customPlugin]` -- compile, bytecode, outdir use defaults

Invalid config values (one test per invalid property):

- `when "config.app.root" is 123` -- throws descriptive error for app.root
- `when "config.app.entrypoint" is 123` -- throws descriptive error for app.entrypoint
- `when "config.build.compile" is "not-a-valid-target"` -- throws descriptive error for build.compile
- `when "config.build.bytecode" is 'yes'` -- throws descriptive error for build.bytecode
- `when "config.build.outdir" is 123` -- throws descriptive error for build.outdir
- `when "config.build.plugins" is "not-an-array"` -- throws descriptive error for build.plugins

#### Integration tests (plugin hooks)

- `when importing from sleepy-serv with plugin loaded` -- intercepts and returns wrapped createApp
- `when importing from sleepy-serv/core with plugin loaded` -- returns raw createApp (not intercepted)
- `when importing non-createApp exports (StatusCode, HttpMethod)` -- passes through from core unchanged
- `when importing type-only exports` -- no plugin overhead (erased at compile time)
- `when the plugin scans api/ relative to the importer` -- resolves routes from the importer's directory (no config)
- `when sleepy.config.ts specifies app.root` -- scans from the configured root instead of importer-relative
- `when multiple files import sleepy-serv with the same root` -- caches scan result (scans once)
- `when multiple files import sleepy-serv with different roots` -- produces separate route sets per root

#### Integration tests (full round-trip)

- `when a simple api/get.ts exists` -- createApp(0) starts server, GET / returns the handler's response
- `when api/users/get.ts exists` -- GET /users returns the handler's response
- `when api/users/:userId/get.ts exists` -- GET /users/123 returns with params.userId = '123'
- `when api/meta.ts exists with middleware` -- middleware runs before all routes in that directory
- `when nested meta.ts files exist` -- middleware runs in parent-to-child order
- `when a handler exports an array` -- module-level middleware + handler execute in order
- `when opts.middleware is provided` -- app-level middleware runs before meta and module middleware
- `when opts.mountPath is provided` -- all routes are prefixed with the mount path
- `when WebSocket endpoints exist` -- GET /ws and POST /ws receive meta middleware from ancestor meta.ts files

#### Initialization-error tests (from Phase 3)

- `when a leaf directory has no method file` -- scanner throws, app does not start
- `when a method file has no default export` -- scanner throws, app does not start

### Verification

- `bun test tests/` -- all E2E tests pass with plugin preloaded
- `bun test packages/server/tests/` -- package tests still pass (no plugin)
- `bun test packages/server/src/plugin/` -- plugin tests pass
- Manual: `bun build --compile` with plugin produces working binary

---

## Phase 5: Build the CLI

**Goal**: Create the `sleepy` executable with `init`, `dev`, `build` commands.

### New files

```
packages/server/src/cli/
  index.ts    # #!/usr/bin/env bun -- arg parsing, command dispatch
  init.ts     # project scaffolding
  dev.ts      # bun --watch --preload sleepy-serv/plugin <entrypoint>
  build.ts    # Bun.build() with plugin + config
```

### Commands

- **`sleepy init`**: Generates `package.json`, `bunfig.toml`, `sleepy.config.ts`, `tsconfig.json`, `src/index.ts`, `src/api/get.ts`. Scripts: `"dev": "sleepy dev"`, `"build": "sleepy build"`.

- **`sleepy dev`**: Loads config, spawns `bun --watch --preload sleepy-serv/plugin <entrypoint>`.

- **`sleepy build`**: Loads config, calls `Bun.build()` with `target: 'bun'`, `minify: true`, the internal plugin + `config.build.plugins`, and compile/bytecode/outdir from config.

### `package.json` bin field

```json
{ "bin": { "sleepy": "./src/cli/index.ts" } }
```

### Tests

#### Unit tests (config loader)

Config loader is shared with Phase 4 (plugin). These tests are already covered there. The CLI reuses the same `loadConfig()` function.

#### Integration tests (`sleepy init`)

- `when run in an empty directory` -- creates package.json, bunfig.toml, sleepy.config.ts, tsconfig.json, src/index.ts, src/api/get.ts
- `when run in a directory with existing package.json` -- merges scripts without overwriting existing fields
- `when run in a directory with existing src/` -- does not overwrite existing files (or warns)
- `when generated project runs sleepy dev` -- the scaffolded app starts and responds to GET /

#### Integration tests (`sleepy dev`)

- `when run with default config` -- spawns bun with --watch and --preload flags, using configured entrypoint
- `when run with custom entrypoint` -- uses entrypoint from sleepy.config.ts
- `when the entrypoint file does not exist` -- exits with clear error

#### Integration tests (`sleepy build`)

- `when run with default config` -- produces bundled output in ./dist
- `when compile is true` -- produces a single-file executable
- `when compile is a target string` -- produces a cross-compiled executable for that target
- `when bytecode is true` -- produces bytecode output
- `when compile and bytecode are both true` -- produces executable with pre-compiled bytecode
- `when custom outdir is set` -- outputs to the configured directory
- `when additional plugins are provided` -- plugins are concatenated with the internal plugin
- `when the scanner throws (invalid api directory)` -- catches AggregateError, formats BuildMessage cleanly, exits non-zero
- `when the entrypoint file does not exist` -- exits with clear error

#### E2E tests

- `when a scaffolded project runs sleepy build --compile` -- the compiled binary starts, listens on a port, and responds to GET /
- `when a scaffolded project runs sleepy build --compile --bytecode` -- same as above, with bytecode enabled

### Verification

- All CLI tests pass
- `sleepy init` in a temp directory produces valid scaffold
- `sleepy dev` starts a watch-mode server
- `sleepy build` produces output in `./dist`
- `sleepy build` with `compile: true` produces a working binary

---

## Phase 6: Types, exports, documentation

**Goal**: Finalize TypeScript declarations and update kbase.

### Type declarations

- `sleepy-serv/core` types: `createApp(port, config, opts?): App`
- `sleepy-serv` types: overloads for `(port, opts?)` and `(port, config, opts?)`

Separate `.d.ts` for the main entry with overloaded signatures. `package.json` exports map points each entry to the correct declaration file.

Runtime disambiguation: `createApp` checks `'routes' in secondArg` to determine if the second argument is `RouteConfig` or `AppOptions`. `RouteConfig` requires `routes` (an array); `AppOptions` has no `routes` field.

### Kbase updates

- `.claude/kbase/architecture/overview.md` -- plugin-based architecture
- `.claude/kbase/architecture/routing.md` -- plugin route resolution
- `.claude/kbase/architecture/request-flow.md` -- no runtime scanning
- `.claude/kbase/architecture/middleware.md` -- meta resolved at load/build time
- `.claude/kbase/architecture/layout.md` -- new `plugin/` and `cli/` directories
- `.claude/kbase/architecture/testing.md` -- plugin preload for E2E

### Final verification

- `bun test` from repo root -- all tests pass
- `bunx eslint .` -- clean
- Type declarations export correct signatures
- `bun build --compile --bytecode` with plugin produces working binary
