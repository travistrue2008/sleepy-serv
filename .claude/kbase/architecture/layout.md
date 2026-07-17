## Layout

The repo root is a **Bun workspace** — dependencies for all members install into a single root `bun.lock`/`node_modules`, not per-package.

- `packages` - All BunJS workspace projects go here.
- `packages/server/` — the published npm package `sleepy-serv` (nearly all work happens here). ESM, `"exports": "./src/index.js"`, no build step.
- `packages/client/` — `sleepy-socket`, versioned in lockstep with `server`, not yet published to npm.
- `example/` — a runnable demo app that consumes the library; living documentation of the routing convention.
- `tests/` — root-level E2E suite (real server + real client over a real WebSocket). Deliberately **not** a workspace member; the packages are declared as root `workspace:*` devDependencies, so they resolve by name from the root `node_modules` (via upward module resolution) rather than relative paths.

See also: [Overview](./overview.md).
