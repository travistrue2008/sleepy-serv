# Plugin

`sleepy-serv` ships a Bun plugin (`sleepy-serv/plugin`) that resolves routes from the filesystem at load time, replacing the runtime dynamic `import()` scanning that previously lived inside `createApp`.

## Why the plugin exists

The original `createApp(port, rootPath, opts)` used `fs.readdirSync` + dynamic `import()` at runtime to discover and load route handlers. This blocked `bun build --compile --bytecode` (the bundler cannot resolve runtime-computed import paths) and added a minor security surface. Moving the scanning into a plugin separates route discovery from server construction.

## Package structure

| Entry | Purpose |
|---|---|
| `src/core/` | The server engine. `createApp(port, config, opts)` accepts a pre-built `RouteConfig`. No scanning, no filesystem access. |
| `src/index.ts` | Main entry point. Re-exports from core. Provides the public `createApp(port, opts?)` that uses plugin-provided routes or scans via the builder fallback. |
| `src/plugin/` | The plugin: scanner, codegen, config loader, builder. |

## Plugin modules

- **`scanner.ts`**: Relocated filesystem scanning functions (`getAllFilePathsRec`, `validateLeafDirectory`, `getMethodFilePaths`, `getMetaFilePaths`, etc.). Exports `scanRoutes(apiRoot)` which returns `{ methods, meta }` with route paths and absolute file paths. Validates directory structure at scan time.
- **`builder.ts`**: Synchronous route builder. Calls `scanRoutes`, then `require()` loads each handler and meta module. Composes middleware chains (meta parent-to-child + module handler). Validates default exports. Returns a `RouteConfig`.
- **`codegen.ts`**: Generates JavaScript source strings with static `import` statements for all route/meta files. Two functions: `generateRoutesModule` (the virtual routes module) and `generateWrapperModule` (the barrel replacement). Designed for `Bun.build()` where the bundler needs static imports it can resolve and bundle.
- **`config.ts`**: Loads `sleepy.config.ts` or `.js` from cwd. Returns `SleepyConfig` with `app.root`, `app.entrypoint`, and `build` options.

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

- **`onResolve` does not intercept bare package specifiers or relative imports at runtime.** It only fires for the initial entry file resolution. This was verified empirically against Bun 1.4.0.
- **`onLoad` works** for intercepting file loading by path. It receives `args.path` (the resolved file path) but NOT `args.importer` (who imported it).
- **`onLoad` results are cached** per file path within a single process. Multiple imports of the same module share one `onLoad` result.
- **`bun test --isolate`** resets the module cache per test file, causing preloads and `onLoad` to re-run for each file. Without it, all test files share one cached result.

For `Bun.build()` (build-time plugins), both `onResolve` and `onLoad` work fully, including for bare package specifiers.

## Route types

```typescript
type RouteDefinition = {
  method: HttpMethod
  path: string
  chain: Handler | MiddlewareChain
}

type MetaEntry = {
  path: string          // route path, e.g. '/' or '/users'
  middleware: Middleware[]
}

type RouteConfig = {
  routes: RouteDefinition[]
  meta?: MetaEntry[]    // for socket-route meta middleware resolution
}
```

`RouteConfig.routes[].chain` contains meta + module middleware (NOT app-level). `createApp` prepends `opts.middleware` and `opts.mountPath` internally.

See also: [Overview](./overview.md), [Routing](./routing.md), [Request Flow](./request-flow.md).
