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
- `server/` — the published npm package `sleepy-serv` (nearly all work happens here). ESM, `"exports": "./src/index.js"`, no build step.
- `client/` — `sleepy-socket`, a currently-blank sibling workspace package. Versioned in lockstep with `server` on release, but not yet published to npm.
- `example/` — a runnable demo app that consumes the library and serves as living documentation of the routing convention.

## Commands

Install and run tests from the **repo root** (workspace-wide):

```bash
bun install                         # CI uses --frozen-lockfile; installs for all workspace members
bun test                            # run all tests (Bun's built-in runner)
bun test server/src/middleware.test.js  # run a single test file
bun test -t "substring"             # run tests matching a name
```

- **Coverage** config lives in the root `bunfig.toml` (text + lcov into `./coverage`), so `bun test --coverage` only picks it up when run from the **repo root**.
- **No build, no TypeScript compiler, no working lint.** `eslint@9` is a devDependency but there is no ESLint config file. "TypeScript support" means only that `.ts` method/meta filenames are accepted by the router (`ALLOWED_FILES_*` in `server/src/index.js`) — there is no `tsconfig.json` and no shipped type declarations.

Run the example app:
```bash
cd server && bun link
cd ../example && npm link sleepy-serv
bun --watch run start   # from example/
```

CI (`.github/workflows/ci.yml`) runs `bun install --frozen-lockfile` then `bun test` from the workspace root on PRs and pushes to `main`. `publish.yml` publishes `server` to npm on GitHub release; it bumps both `server/package.json` and `client/package.json` versions via `bun pm version` so the pair stays in lockstep.

## Architecture

`sleepy-serv` is a **filesystem-driven REST server**: the directory layout under `<rootPath>/api` defines the routes. The entire engine is in `server/src/index.js`; the public API is `createApp(port, rootPath, opts)`, `middleware`, and re-exported error classes.

**Routing convention:** directories are resources, method-named files are handlers. `api/users/:userId/get.js` → `GET /users/:userId`. Colon-prefixed dirs are dynamic params. Supported methods: GET, HEAD, PATCH, POST, PUT, DELETE.

**Request flow** (`server/src/index.js`):
1. `getAllFilePathsRec` recursively scans `<rootPath>/api` and validates directories.
2. `buildRoutesPaths` maps each method file to `{ method, path, metaMiddlewarePath, modulePath }`.
3. `buildHandlers` dynamically `import()`s each module, assembles the middleware chain, and wraps it in a single async handler.
4. `buildServerRoutes` builds the route table for `Bun.serve`; `buildServer` starts the server.

**Key mental models** (these differ from Express and aren't obvious from a single file):
- **`res` is an accumulator, not a response.** Handlers receive `(req, res, next)`; `res` is a plain `{}` that middleware write to in order to pass data down the chain. The actual HTTP response is the `Response` object a handler **returns** — returning a non-`Response` throws `TypeError`.
- **Middleware order:** app-level (from `createApp` opts) → directory-level (`meta.js` `export const middleware`, root→leaf) → route-level (the handler array). Directory middleware applies by **path-prefix matching**: a `meta.js` applies to a module only if its directory is a string prefix of the module path, sorted shortest-first (`buildRoutesPaths`).
- **Errors map to HTTP status via a `static status`** on the error class, read off `err.constructor` in the `Bun.serve` `error` hook. `server/src/errors.js` defines a `RequestError` base plus one subclass per 4xx/5xx code. Throwing e.g. `NotFoundError` auto-responds 404; any non-`RequestError` becomes 500.
- **404 vs 405 live in two places:** every known path is pre-seeded with all six verbs pointing at a 405 handler (`buildServerRoutes`), while the server-level `fetch` fallback throws `NotFoundError` for unknown paths (`buildServer`).
- **Built-in middleware** (`server/src/middleware.js`): `parseJson`; `validateSchema(schemas)` (AJV — validates `headers`/`params`/`query` via a simplified string-format schema and `body` via full JSON Schema); `setValidationFormats(formats)` to register custom named regex formats.

**Gotchas:**
- `server/src/meta.js` is a generic tree/object utility module (`range`, `traverse`, `deepCopy`, `getValueByPath`, …) — **unrelated** to route `meta.js` files. Don't conflate them.
- `validateDirectoryIllegalFiles` in `index.js` is commented out, so the "only method/meta files allowed in /api" rule is **not currently enforced** despite the README/ROADMAP implying it is.
- **WebSocket is not implemented.** This branch is named `websocket` but is currently identical to `main`; it's an open item in `ROADMAP.md`. Any implementation slots into `buildServer` in `server/src/index.js` using `Bun.serve`'s native `websocket` option + `server.upgrade()` (see `.claude/use-bun.md`).

## Tests

Two styles, both under `server/` and run with `bun test`:
- **Unit tests** colocated in `server/src/`: `errors.test.js`, `meta.test.js`, `middleware.test.js`.
- **Integration tests** in `server/tests/<category>/<case>/integration.test.js`, each with a real `api/` fixture that the test boots via `createApp` and hits with `fetch`. Get a unique port from `getPortCounter()` in `server/tests/_helpers.js` (increments from 3000) so parallel tests don't collide.
