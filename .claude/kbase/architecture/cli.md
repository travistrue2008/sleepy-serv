# CLI

`sleepy-serv` ships a CLI executable called `sleepy` for project scaffolding, development, and production builds.

## Commands

| Command | Purpose |
|---|---|
| `sleepy init` | Scaffold a new project in the current directory |
| `sleepy dev` | Start the dev server with watch mode + plugin |
| `sleepy build` | Production build via `Bun.build()` with the plugin |
| `sleepy --help` | Print usage |

## `sleepy init`

Creates a minimal project structure:
- `package.json` with `sleepy-serv` dependency and `dev`/`build` scripts
- `sleepy.config.ts` (empty, uses defaults)
- `tsconfig.json` configured for Bun + TypeScript
- `src/index.ts` with `createApp(3000)`
- `src/api/get.ts` with a hello-world handler

If `package.json` already exists, merges scripts without overwriting other fields. If `src/` files already exist, skips them with a warning.

## `sleepy dev`

1. Loads `sleepy.config.ts` via `loadConfig()` (from [plugin/config.ts](./plugin.md))
2. Resolves entrypoint from `config.app.entrypoint` (default: `./src/index.ts`)
3. Spawns `bun --watch --preload sleepy-serv/plugin <entrypoint>`
4. Inherits stdio (stdout, stderr, stdin pass through)
5. Exits with the child process exit code

Watch mode restarts the server on file changes. The plugin preload scans `src/api/` and generates routes via codegen at each restart.

## `sleepy build`

1. Loads `sleepy.config.ts`
2. Creates a `BunPlugin` with the same `onLoad` + codegen approach as the runtime plugin
3. Calls `Bun.build()` with the plugin + user plugins from config
4. User plugins run before the sleepy-serv plugin (sleepy-serv is last, ensuring it can't be overridden)
5. On success: prints output file paths
6. On failure: formats error messages, exits non-zero

Build options from `sleepy.config.ts`:
- `build.compile` -- `true` for same-platform executable, or a cross-compile target string (e.g., `'linux-x64'`)
- `build.bytecode` -- pre-compile to bytecode for faster startup
- `build.outdir` -- output directory (default: `./dist`)
- `build.plugins` -- additional `BunPlugin[]` concatenated with the internal plugin

## Implementation

Source lives in `packages/server/src/cli/`:
- `index.ts` -- entry point with shebang, `parseArgs` dispatch
- `init.ts` -- scaffolding logic
- `dev.ts` -- subprocess spawning
- `build.ts` -- `Bun.build()` integration

Registered via `package.json` `bin` field: `"sleepy": "./src/cli/index.ts"`. Available as `sleepy` in `node_modules/.bin/` after `bun install`.

See also: [Plugin](./plugin.md), [Testing](./testing.md), [Overview](./overview.md).
