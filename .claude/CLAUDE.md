# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime & Package Manager

This project runs on **Bun** (v1.2.3+), **not Node.js**. Use Bun for everything as the code depends on it (`Bun.serve`, `Bun.write`, `Bun.argv`, raw-mode stdin).

- Use `bun <file>` instead of `node`, `bunx` instead of `npx`, `bun install` instead of npm/yarn/pnpm.
- Prefer Bun APIs over Node/third-party equivalents: `Bun.serve()` (not express), built-in `WebSocket` (not `ws`), `bun:sqlite`, `Bun.file`. Bun auto-loads `.env`.
- [`codegraph`](https://github.com/colbymchenry/codegraph) is required and must be installed globally via Bun:
  - `bun add -g @colbymchenry/codegraph`
  - `codegraph install`

## Repository Layout

The repo root is a **Bun workspace** (see root `package.json`) — dependencies for all members install into a single root `bun.lock`/`node_modules`, not per-package. Areas:
- `packages/server/` — the published npm package `sleepy-serv` (nearly all work happens here). ESM, `"exports": "./src/index.js"`, no build step.
- `packages/client/` — `sleepy-socket`, a currently-blank sibling workspace package. Versioned in lockstep with `server` on release, but not yet published to npm.
- `example/` — a runnable demo app that consumes the library and serves as living documentation of the routing convention.

## Commands

Install and run tests from the **repo root** (workspace-wide):

```bash
bun install                         # CI uses --frozen-lockfile; installs for all workspace members
bun test                            # run all tests (Bun's built-in runner)
bun test packages/server/src/middleware.test.js  # run a single test file
bun test -t "substring"             # run tests matching a name
```

- **Coverage** config lives in the root `bunfig.toml` (text + lcov into `./coverage`), so `bun test --coverage` only picks it up when run from the **repo root**.
- **No build, no TypeScript compiler, no working lint.** `eslint@9` is a devDependency but there is no ESLint config file. "TypeScript support" means only that `.ts` method/meta filenames are accepted by the router (`ALLOWED_FILES_*` in `packages/server/src/index.js`) — there is no `tsconfig.json` and no shipped type declarations.

Run the example app:
```bash
cd packages/server && bun link
cd ../../example && npm link sleepy-serv
bun --watch run start   # from example/
```

CI (`.github/workflows/ci.yml`) runs `bun install --frozen-lockfile` then `bun test` from the workspace root on PRs and pushes to `main`. `publish.yml` publishes `server` to npm on GitHub release; it bumps both `packages/server/package.json` and `packages/client/package.json` versions via `bun pm version` so the pair stays in lockstep.

## Architecture

`sleepy-serv` is a **filesystem-driven REST server**: the directory layout under `<rootPath>/api` defines the routes. The entire engine is in `packages/server/src/index.js`; the public API is `createApp(port, rootPath, opts)`, `middleware`, and re-exported error classes.

**Routing convention:** directories are resources, method-named files are handlers. `api/users/:userId/get.js` → `GET /users/:userId`. Colon-prefixed dirs are dynamic params. Supported methods: GET, HEAD, PATCH, POST, PUT, DELETE.

**Request flow** (`packages/server/src/index.js`):
1. `getAllFilePathsRec` recursively scans `<rootPath>/api` and validates directories.
2. `buildRoutesPaths` maps each method file to `{ method, path, metaMiddlewarePath, modulePath }`.
3. `buildHandlers` dynamically `import()`s each module, assembles the middleware chain, and wraps it in a single async handler.
4. `buildServerRoutes` builds the route table for `Bun.serve`; `buildServer` starts the server.

**Key mental models** (these differ from Express and aren't obvious from a single file):
- **`res` is an accumulator, not a response.** Handlers receive `(req, res, next)`; `res` is a plain `{}` that middleware write to in order to pass data down the chain. The actual HTTP response is the `Response` object a handler **returns** — returning a non-`Response` throws `TypeError`.
- **Middleware order:** app-level (from `createApp` opts) → directory-level (`meta.js` `export const middleware`, root→leaf) → route-level (the handler array). Directory middleware applies by **path-prefix matching**: a `meta.js` applies to a module only if its directory is a string prefix of the module path, sorted shortest-first (`buildRoutesPaths`).
- **Errors map to HTTP status via a `static status`** on the error class, read off `err.constructor` in the `Bun.serve` `error` hook. `packages/server/src/errors.js` defines a `RequestError` base plus one subclass per 4xx/5xx code. Throwing e.g. `NotFoundError` auto-responds 404; any non-`RequestError` becomes 500.
- **404 vs 405 live in two places:** every known path is pre-seeded with all six verbs pointing at a 405 handler (`buildServerRoutes`), while the server-level `fetch` fallback throws `NotFoundError` for unknown paths (`buildServer`).
- **Built-in middleware** (`packages/server/src/middleware.js`): `parseJson`; `validateSchema(schemas)` (AJV — validates `headers`/`params`/`query` via a simplified string-format schema and `body` via full JSON Schema); `setValidationFormats(formats)` to register custom named regex formats.

**Gotchas:**
- `packages/server/src/meta.js` is a generic tree/object utility module (`range`, `traverse`, `deepCopy`, `getValueByPath`, …) — **unrelated** to route `meta.js` files. Don't conflate them.
- `validateDirectoryIllegalFiles` in `index.js` is commented out, so the "only method/meta files allowed in /api" rule is **not currently enforced** despite the README/ROADMAP implying it is.
- **WebSocket is not implemented.** This branch is named `websocket` but is currently identical to `main`; it's an open item in `ROADMAP.md`. Any implementation slots into `buildServer` in `packages/server/src/index.js` using `Bun.serve`'s native `websocket` option + `server.upgrade()` (see `.claude/use-bun.md`).

## Tests

See `.claude/testing.md` for test-writing conventions (naming, structure, assertions, time
mocking).

Three styles, run with `bun test`:
- **Unit tests** colocated in `packages/server/src/` and `packages/client/src/`: `errors.test.js`, `meta.test.js`, `middleware.test.js`, `packages/client/src/index.test.js` (mocks the `WebSocket` global rather than booting a real server).
- **Server integration tests** in `packages/server/tests/<category>/<case>/integration.test.js`, each with a real `api/` fixture that the test boots via `createApp` and hits with `fetch`. Get a unique port from `getPortCounter()` in `packages/server/tests/_helpers.js` (increments from 3000) so parallel tests don't collide.
- **Root-level E2E tests** in `tests/<category>/<case>/integration.test.js` — a real `sleepy-serv` server and a real `sleepy-socket` client talking over an actual loopback WebSocket, both in one `bun test` process. Boot via `boot()` in `tests/_helpers.js` (uses port `0` for an OS-assigned ephemeral port).
  - `tests/` is **not** a workspace member (deliberately, to avoid `workspace:*` version pinning) but still imports the packages by name (`sleepy-serv`, `sleepy-socket`) via `bun link`, not relative paths. This requires a **one-time, per-machine** setup step that a bare `bun install` does *not* perform:
    ```bash
    cd packages/server && bun link
    cd ../client && bun link
    cd ../../tests && bun link sleepy-serv sleepy-socket
    ```
  - Because `bun link` registers packages in Bun's global link store (machine-wide, outside the lockfile), CI must run these same steps before `bun test` — a plain `bun install --frozen-lockfile` will not wire up `tests/node_modules/sleepy-serv`/`sleepy-socket`.
