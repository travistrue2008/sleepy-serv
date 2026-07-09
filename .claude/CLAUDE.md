# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Runs on **Bun** (v1.2.3+), not Node.js — use `bun`/`bunx`/`bun install`, and prefer Bun APIs (`Bun.serve`, built-in `WebSocket`, `bun:sqlite`, `Bun.file`) over Node/third-party equivalents.

## Repository Layout

The repo root is a **Bun workspace** — dependencies for all members install into a single root `bun.lock`/`node_modules`, not per-package.

- `packages/server/` — the published npm package `sleepy-serv` (nearly all work happens here). ESM, `"exports": "./src/index.js"`, no build step.
- `packages/client/` — `sleepy-socket`, versioned in lockstep with `server`, not yet published to npm.
- `example/` — a runnable demo app that consumes the library; living documentation of the routing convention.
- `tests/` — root-level E2E suite (real server + real client over a real WebSocket). Deliberately **not** a workspace member; imports the packages by name via `bun link` rather than relative paths (see Commands).

## Commands

Install and run tests from the **repo root** (workspace-wide):

```bash
bun install                   # CI uses --frozen-lockfile; installs for all workspace members
bun test                      # run all tests (Bun's built-in runner)
bun test path/to/file.test.js # run a single test file
bun test -t "substring"       # run tests matching a name
bunx eslint .                 # lint (rules auto-load from .claude/rules/linting.md)
```

`codegraph` is required and must be installed globally: `bun add -g @colbymchenry/codegraph`, then `codegraph install`.

One-time, per-machine setup for the root `tests/` E2E suite (`bun install` alone does not wire this up — CI must also run it):
```bash
cd packages/server && bun link
cd ../client && bun link
cd ../../tests && bun link sleepy-serv sleepy-socket
```

Run the example app:
```bash
cd packages/server && bun link
cd ../../example && npm link sleepy-serv
bun --watch run start   # from example/
```

## Architecture

`sleepy-serv` is a **filesystem-driven REST server**: the directory layout under `<rootPath>/api` defines the routes. The engine is `packages/server/src/index.js`; the public API is `createApp(port, rootPath, opts)`, `middleware`, and re-exported error classes.

**Routing convention:** directories are resources, method-named files are handlers. `api/users/:userId/get.js` → `GET /users/:userId`. Colon-prefixed dirs are dynamic params. Supported methods: GET, HEAD, PATCH, POST, PUT, DELETE.

**Request flow:** `getAllFilePathsRec` recursively scans `<rootPath>/api` → `buildRoutesPaths` maps each method file to `{ method, path, metaMiddlewarePath, modulePath }` → `buildHandlers` dynamically `import()`s each module and assembles the middleware chain → `buildServerRoutes` builds the route table for `Bun.serve`; `buildServer` starts it.

**Key mental models** (differ from Express, not obvious from a single file):
- **`res` is an accumulator, not a response.** Handlers receive `(req, res, next)`; `res` is a plain `{}` that middleware write to in order to pass data down the chain. The actual HTTP response is the `Response` object a handler **returns** — returning a non-`Response` throws `TypeError`.
- **Middleware order:** app-level (`createApp` opts) → directory-level (`meta.js` `export const middleware`, root→leaf) → route-level (the handler array). Directory middleware applies by **path-prefix matching**, sorted shortest-first.
- **Errors map to HTTP status via a `static status`** on the error class, read off `err.constructor` in the `Bun.serve` `error` hook. `packages/server/src/errors.js` defines a `RequestError` base plus one subclass per 4xx/5xx code.
- **404 vs 405 live in two places:** every known path is pre-seeded with all six verbs pointing at a 405 handler (`buildServerRoutes`), while the server-level `fetch` fallback throws `NotFoundError` for unknown paths (`buildServer`).
- **Built-in middleware** (`packages/server/src/middleware.js`): `parseJson`; `validateSchema(schemas)` (AJV); `setValidationFormats(formats)`.

**Gotchas:**
- `packages/server/src/meta.js` is a generic tree/object utility module — **unrelated** to route `meta.js` files. Don't conflate them.
- `validateDirectoryIllegalFiles` in `index.js` is commented out, so the "only method/meta files allowed in /api" rule is **not currently enforced** despite the README/ROADMAP implying it is.

## Verification

Run `bun test` from the repo root before considering any change done. Coverage (text + lcov into `./coverage`) is configured in root `bunfig.toml` and is only picked up when run from the repo root.
