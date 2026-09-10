# Plugin

`sleepy-serv` ships a Bun plugin (`sleepy-serv/plugin`) that resolves routes from the filesystem at load time via code generation, replacing the runtime dynamic `import()` scanning that previously lived inside `createApp`.

## Why the plugin exists

The original `createApp(port, rootPath, opts)` used `fs.readdirSync` + dynamic `import()` at runtime to discover and load route handlers. This blocked `bun build --compile --bytecode` (the bundler cannot resolve runtime-computed import paths) and added a minor security surface. Moving the scanning into a plugin separates route discovery from server construction.

## Package structure

| Entry | Purpose |
|---|---|
| `src/core/` | The server engine. `createApp(port, config, opts)` accepts a pre-built `RouteConfig`. No scanning, no filesystem access. |
| `src/index.ts` | Main entry point. Re-exports from core. Declares the public `createApp(port, opts?)` type signature for consumers. |
| `src/plugin/` | The plugin: scanner, codegen, config loader. |

## How it works

The plugin is loaded as a preload (`bun --preload sleepy-serv/plugin`). On load, it:

1. Reads `sleepy.config.ts`/`.js` via `loadConfig()` (defaults to `app.root: './src/api'`)
2. Resolves the barrel file path via `require.resolve('sleepy-serv')`
3. Registers `Bun.plugin()` with an `onLoad` hook matching that exact path
4. When the barrel is imported, `onLoad` fires: scans the filesystem via `scanRoutes(apiRoot)`, generates a replacement module via `generateBarrelModule(scanResult)`, and returns it
5. The generated module has static `import` statements for every route handler and meta file, a composed `RouteConfig`, and a `createApp(port, opts)` wrapper

## Plugin modules

- **`scanner.ts`**: Filesystem scanning functions (`getAllFilePathsRec`, `validateLeafDirectory`, `getMethodFilePaths`, `getMetaFilePaths`, etc.). Exports `scanRoutes(apiRoot)` returning `{ methods, meta }` with route paths and absolute file paths. Validates directory structure at scan time.
- **`codegen.ts`**: Exports `generateBarrelModule(scanResult)` which produces a JavaScript source string that:
  - Re-exports everything from `./core`
  - Has static `import` statements for all handler and meta files
  - Validates default exports at module load time
  - Normalizes handler chains (`Array.isArray` check)
  - Composes meta middleware into route chains (parent-to-child order)
  - Exports `createApp(port, opts)` wrapper with routes pre-bound
  - Uses `import * as metaModule_N` (not named `{ middleware }`) to handle meta files that don't export `middleware`
- **`config.ts`**: Loads `sleepy.config.ts` or `.js` from cwd (`.ts` takes precedence). Returns `SleepyConfig`.

## Config file

```typescript
// sleepy.config.ts
export default {
  app: {
    root: './src/api',            // default: './src/api'
    entrypoint: './src/index.ts', // default: './src/index.ts'
  },
  build: {
    compile: false,
    bytecode: false,
    outdir: './dist',
    plugins: [],
  },
}
```

## Bun runtime plugin limitations

Bun's runtime `Bun.plugin()` has constraints that shaped the architecture:

- **`onResolve` does not intercept bare package specifiers or relative imports at runtime.** It only fires for the initial entry file resolution. Verified empirically against Bun 1.4.0.
- **`onLoad` works** for intercepting file loading by path. It receives `args.path` (the resolved file path) but NOT `args.importer` (who imported it). This is by design: `onLoad` runs after resolution, when the module is identified by path, not by who asked for it.
- **`onLoad` results are cached** per file path within a single process. This is why integration/E2E tests run the server as a subprocess: each process gets a fresh `onLoad` call, allowing different route fixtures per test.
- **Error handling**: Thrown errors in `onLoad` produce clean output at runtime (error message + one-line location). For `Bun.build()`, they throw `AggregateError` containing `BuildMessage` objects.
- **Structured errors** (`return { errors: [...] }`) are NOT supported by Bun's `onLoad`; it requires `{ contents }`.

For `Bun.build()` (build-time plugins), both `onResolve` and `onLoad` work fully, including for bare package specifiers.

## Route types

```typescript
type RouteDefinition = {
  method: HttpMethod
  path: string
  chain: Handler | MiddlewareChain
}

type MetaEntry = {
  path: string
  middleware: Middleware[]
}

type RouteConfig = {
  routes: RouteDefinition[]
  meta?: MetaEntry[]
}
```

`RouteConfig.routes[].chain` contains meta + module middleware (NOT app-level). `createApp` prepends `opts.middleware` and `opts.mountPath` internally.

See also: [Overview](./overview.md), [Routing](./routing.md), [Request Flow](./request-flow.md), [Testing](./testing.md).
