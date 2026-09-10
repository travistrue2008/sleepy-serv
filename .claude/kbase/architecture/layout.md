## Layout

The repo root is a **Bun workspace**: dependencies for all members install into a single root `bun.lock`/`node_modules`, not per-package.

- `packages` - All BunJS workspace projects go here.
- `packages/server/`: the published npm package `sleepy-serv` (nearly all work happens here). ESM, exports `.` and `./plugin`. Source split into `src/core/` (engine), `src/plugin/` (scanner, codegen, config), and `src/index.ts` (main entry point with type declarations).
- `packages/client/`: `sleepy-socket`, published to npm and versioned in lockstep with `server`. Both packages always release together under one version.
- `tests/`: root-level E2E suite (`e2e.test.ts`). Each test directory mimics a consumer project (`src/index.ts` + `src/api/`). Tests spawn the app as a subprocess via `createServer()`, making HTTP/WebSocket requests from the outside. Deliberately **not** a workspace member; packages resolve by name from root `node_modules` via upward resolution.
- `.github/scripts/`: release helpers invoked by the publish workflow. The non-trivial logic lives here rather than inline in YAML so it can be run and tested locally.

The `example/` app was removed once the root E2E suite covered both transports; the suite is now the living documentation of the routing convention.

Only `packages/server` and `packages/client` are workspace members. Anything else at the root (including one-off scratch directories) is inert with respect to `bun install`.

See also: [Overview](./overview.md), [Publishing and Releases](../operations/publishing.md).
