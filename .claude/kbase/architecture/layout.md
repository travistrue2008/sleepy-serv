## Layout

The repo root is a **Bun workspace**: dependencies for all members install into a single root `bun.lock`/`node_modules`, not per-package.

- `packages` - All BunJS workspace projects go here.
- `packages/server/`: the published npm package `sleepy-serv` (nearly all work happens here). ESM, `"exports": "./src/index.js"`, no build step.
- `packages/client/`: `sleepy-socket`, published to npm and versioned in lockstep with `server`. Both packages always release together under one version.
- `tests/`: root-level E2E suite (real server + real client over a real WebSocket). Deliberately **not** a workspace member; the packages are declared as root `workspace:*` devDependencies, so they resolve by name from the root `node_modules` (via upward module resolution) rather than relative paths.
- `.github/scripts/`: release helpers invoked by the publish workflow. The non-trivial logic lives here rather than inline in YAML so it can be run and tested locally.

The `example/` app was removed once the root E2E suite covered both transports; the suite is now the living documentation of the routing convention.

Only `packages/server` and `packages/client` are workspace members. Anything else at the root (including one-off scratch directories) is inert with respect to `bun install`.

See also: [Overview](./overview.md), [Publishing and Releases](../operations/publishing.md).
