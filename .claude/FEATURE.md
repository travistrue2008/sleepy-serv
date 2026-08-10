# TypeScript conversion checklist

Living progress tracker for the incremental JavaScript to TypeScript
migration. Tick a box only after that file is converted, verified, and
committed.

## Rules

- One module at a time, then stop and evaluate before the next.
- Convert the implementation file first. Its unit test file converts only
  after the implementation has been personally verified.
- Order is by fewest in-codebase import dependencies, ties broken by
  fewest total imports, then by least work.
- `.js` files must keep working with zero errors for the whole migration.
- No `any`. Explicit `any` is an ESLint error on every `.ts` file.
- Each iteration opens by committing the previous iteration's work.
  `git add` and `git commit` only, never push or pull.

## Setup

- [x] Root devDependencies: `typescript`, `@types/bun`,
      `typescript-eslint`
- [x] `tsconfig.base.json` (runtime-neutral shared base)
- [x] `packages/server/tsconfig.json`
- [x] `typecheck` script in `packages/server/package.json`
- [x] `**/*.ts` ESLint block with `no-explicit-any: error`
- [x] `types/bun-test.d.ts` augmenting bun-types with the missing
      `toHaveBeenCalledOnce` matcher (shared by both packages; remove
      once bun-types ships it upstream)
- [ ] `packages/server/tsconfig.build.json` and `build:types` script
      (deferred until `index.ts` exists)
- [ ] Server `exports` conditions and `publish.yml` build step
      (deferred, same reason)
- [x] Swap `.npmignore` for a `files` allowlist in both packages
      (verified with `npm pack --dry-run`: server 10 files, client 6,
      both identical to their pre-change baselines)
- [ ] Client `tsconfig.json` and `tsconfig.portable.json`, `engines`,
      `dist` build wiring (start of group 3). When `dist` lands, the
      client's `files` becomes `["dist"]`.

## Deferred refinements

Revisit once the work that motivates them is actually done, rather than
guessing early.

- [ ] **Tighten `TReq` in `utils.ts`.** `executeMiddlewareChain` is
      currently generic over an unconstrained `TReq` because `utils` only
      forwards the request and never inspects it. The two callers build
      different shapes: `index.js:71` (`buildBunRequest`) produces
      `{method, route, headers, params, query, raw, server, json}`, while
      `socket.js:208` (`buildRequest`) produces
      `{id, clientId, method, route, headers, params, query, json}`.
      The common core is `method`, `route`, `headers`, `params`, `query`,
      `json`. Once `socket.ts` and `index.ts` are converted (last two in
      group 1), that core can become a named base type with the generic
      constrained to it, or the generic can collapse into a union.
      Deliberately deferred: both shapes only become visible in
      TypeScript when their own modules convert.
      Note: `utils.test.ts` uses `const REQ = { url: '/users' }`, which
      matches neither envelope (neither has a `url` field). It compiles
      today only because `TReq` is unconstrained, so tightening the
      constraint will correctly break it and the fixture will need a
      realistic shape.

## 1. `server` implementation and unit tests

- [x] `packages/server/src/utils.js`
- [x] `packages/server/src/utils.test.js`
- [x] ~~`packages/server/src/meta.js`~~ deleted, not converted. It was a
      generic tree/object utility with zero production callers: nothing
      imported it but its own test, and it was never re-exported from
      `index.js`. Recoverable from git history if ever wanted.
- [x] ~~`packages/server/src/meta.test.js`~~ deleted with it (22 tests).
- [x] `packages/server/src/status.ts` (new module, not a conversion)
- [x] `packages/server/src/status.test.ts` (new, pins codes to literals)
- [x] `packages/server/src/errors.js` (getters return `StatusCode`)
- [ ] `packages/server/src/errors.test.js`
- [ ] `packages/server/src/middleware.js`
- [ ] `packages/server/src/middleware.test.js`
- [ ] `packages/server/src/messages.js` (`TYPES` becomes `MessageType`,
      atomic across `socket.js`, both test files, `tests/helpers.js`, and
      the `ws-message` integration test)
- [ ] `packages/server/src/messages.test.js`
- [ ] `packages/server/src/socket.js`
- [ ] `packages/server/src/socket.test.js`
- [ ] `packages/server/src/index.js` (no unit test file)
- [ ] `test-setup.js` (root, cross-cutting Bun test preload)

## 2. `server` integration tests (`packages/server/tests/`)

- [ ] `packages/server/tests/helpers.js` (shared)
- [ ] `packages/server/tests/errors/initialization/leaf-directory-has-no-method-file/api/users/meta.js`
- [ ] `packages/server/tests/errors/initialization/leaf-directory-has-no-method-file/integration.test.js`
- [ ] `packages/server/tests/errors/initialization/method-file-has-no-default-export/api/get.js`
- [ ] `packages/server/tests/errors/initialization/method-file-has-no-default-export/integration.test.js`
- [ ] `packages/server/tests/errors/initialization/whitelist-supported-file/api/get.js`
- [ ] `packages/server/tests/errors/initialization/whitelist-supported-file/api/get.util.js`
- [ ] `packages/server/tests/errors/initialization/whitelist-supported-file/integration.test.js`
- [ ] `packages/server/tests/errors/request/middleware-throws-error/api/get.js`
- [ ] `packages/server/tests/errors/request/middleware-throws-error/integration.test.js`
- [ ] `packages/server/tests/errors/request/no-Response-object-returned/api/get.js`
- [ ] `packages/server/tests/errors/request/no-Response-object-returned/integration.test.js`
- [ ] `packages/server/tests/errors/request/not-allowed-method/api/users/post.js`
- [ ] `packages/server/tests/errors/request/not-allowed-method/integration.test.js`
- [ ] `packages/server/tests/errors/request/not-found-resource/api/users/get.js`
- [ ] `packages/server/tests/errors/request/not-found-resource/integration.test.js`
- [ ] `packages/server/tests/errors/request/throws-RequestError/api/get.js`
- [ ] `packages/server/tests/errors/request/throws-RequestError/integration.test.js`
- [ ] `packages/server/tests/errors/request/throws-generic-error/api/get.js`
- [ ] `packages/server/tests/errors/request/throws-generic-error/integration.test.js`
- [ ] `packages/server/tests/errors/request/ws-endpoints/api/get.js`
- [ ] `packages/server/tests/errors/request/ws-endpoints/integration.test.js`
- [ ] `packages/server/tests/errors/request/ws-message/api/get.js`
- [ ] `packages/server/tests/errors/request/ws-message/integration.test.js`
- [ ] `packages/server/tests/middleware/all-levels/api/meta.js`
- [ ] `packages/server/tests/middleware/all-levels/api/users/get.js`
- [ ] `packages/server/tests/middleware/all-levels/api/users/meta.js`
- [ ] `packages/server/tests/middleware/all-levels/integration.test.js`
- [ ] `packages/server/tests/middleware/app-level/api/users/get.js`
- [ ] `packages/server/tests/middleware/app-level/integration.test.js`
- [ ] `packages/server/tests/middleware/meta-level-parent/api/meta.js`
- [ ] `packages/server/tests/middleware/meta-level-parent/api/users/get.js`
- [ ] `packages/server/tests/middleware/meta-level-parent/integration.test.js`
- [ ] `packages/server/tests/middleware/meta-level-sibling/api/users/get.js`
- [ ] `packages/server/tests/middleware/meta-level-sibling/api/users/meta.js`
- [ ] `packages/server/tests/middleware/meta-level-sibling/integration.test.js`
- [ ] `packages/server/tests/middleware/meta-no-middleware/api/users/get.js`
- [ ] `packages/server/tests/middleware/meta-no-middleware/api/users/meta.js`
- [ ] `packages/server/tests/middleware/meta-no-middleware/integration.test.js`
- [ ] `packages/server/tests/middleware/module-level/api/users/get.js`
- [ ] `packages/server/tests/middleware/module-level/integration.test.js`
- [ ] `packages/server/tests/request/querystring/api/get.js`
- [ ] `packages/server/tests/request/querystring/integration.test.js`
- [ ] `packages/server/tests/request/route-dynamic/api/users/:userId/get.js`
- [ ] `packages/server/tests/request/route-dynamic/integration.test.js`
- [ ] `packages/server/tests/request/route-resource/api/users/get.js`
- [ ] `packages/server/tests/request/route-resource/integration.test.js`
- [ ] `packages/server/tests/request/route-root/api/get.js`
- [ ] `packages/server/tests/request/route-root/integration.test.js`
- [ ] `packages/server/tests/url/custom-host/api/get.js`
- [ ] `packages/server/tests/url/custom-host/integration.test.js`
- [ ] `packages/server/tests/url/mount-path/api/users/get.js`
- [ ] `packages/server/tests/url/mount-path/integration.test.js`

## 3. `client` implementation and unit tests

Starts with the client's own config work: `tsconfig.json` plus
`tsconfig.portable.json`, the `engines` field, and the `dist` build
wiring (which also flips `files` from `src` to `dist`).

- [ ] `packages/client/src/utils.js`
- [ ] `packages/client/src/utils.test.js`
- [ ] `packages/client/src/messages.js` (`TYPES` becomes `MessageType`,
      a public breaking change, atomic across `index.js`, both test
      files, and the 22 root E2E files in group 4; needs a CHANGELOG
      entry, a version bump, and updates to
      `packages/client/README.md:267-269` and
      `.claude/kbase/architecture/websocket.md:5,7,112`)
- [ ] `packages/client/src/messages.test.js`
- [ ] `packages/client/src/index.js`
- [ ] `packages/client/src/index.test.js`

## 4. E2E tests (root `tests/`)

- [ ] `tests/helpers.js` (shared)
- [ ] `tests/auth/auth.js`
- [ ] `tests/auth/api/auth/post.js`
- [ ] `tests/auth/api/protected/get.js`
- [ ] `tests/auth/api/protected/meta.js`
- [ ] `tests/auth/api/public/get.js`
- [ ] `tests/auth/api/ws/:clientId/put.js`
- [ ] `tests/auth/api/ws/post.js`
- [ ] `tests/auth/integration.test.js`
- [ ] `tests/middleware/app-level/api/get.js`
- [ ] `tests/middleware/app-level/api/post.js`
- [ ] `tests/middleware/app-level/integration.test.js`
- [ ] `tests/middleware/meta-level/api/get.js`
- [ ] `tests/middleware/meta-level/api/meta.js`
- [ ] `tests/middleware/meta-level/integration.test.js`
- [ ] `tests/middleware/ws/endpoint-level/api/ws/:clientId/put.js`
- [ ] `tests/middleware/ws/endpoint-level/api/ws/get.js`
- [ ] `tests/middleware/ws/endpoint-level/api/ws/post.js`
- [ ] `tests/middleware/ws/endpoint-level/integration.test.js`
- [ ] `tests/middleware/ws/meta-level/api/meta.js`
- [ ] `tests/middleware/ws/meta-level/api/ws/:clientId/head.js`
- [ ] `tests/middleware/ws/meta-level/api/ws/:clientId/meta.js`
- [ ] `tests/middleware/ws/meta-level/api/ws/meta.js`
- [ ] `tests/middleware/ws/meta-level/integration.test.js`
- [ ] `tests/middleware/ws/root-level/api/get.js`
- [ ] `tests/middleware/ws/root-level/integration.test.js`
- [ ] `tests/mount-path/api/get.js`
- [ ] `tests/mount-path/integration.test.js`
- [ ] `tests/request-errors/handler-throws/api/boom/get.js`
- [ ] `tests/request-errors/handler-throws/api/conflict/get.js`
- [ ] `tests/request-errors/handler-throws/integration.test.js`
- [ ] `tests/request-errors/not-allowed-method/api/get.js`
- [ ] `tests/request-errors/not-allowed-method/integration.test.js`
- [ ] `tests/request-errors/not-found-resource/api/get.js`
- [ ] `tests/request-errors/not-found-resource/integration.test.js`
- [ ] `tests/request/headers-passthrough/api/whoami/get.js`
- [ ] `tests/request/headers-passthrough/integration.test.js`
- [ ] `tests/request/message-concurrency/api/get.js`
- [ ] `tests/request/message-concurrency/integration.test.js`
- [ ] `tests/request/other-verbs/api/resource/delete.js`
- [ ] `tests/request/other-verbs/api/resource/patch.js`
- [ ] `tests/request/other-verbs/api/resource/put.js`
- [ ] `tests/request/other-verbs/integration.test.js`
- [ ] `tests/request/post-with-body/api/echo/post.js`
- [ ] `tests/request/post-with-body/integration.test.js`
- [ ] `tests/request/primitive-body/api/echo/post.js`
- [ ] `tests/request/primitive-body/integration.test.js`
- [ ] `tests/request/query-passthrough/api/search/get.js`
- [ ] `tests/request/query-passthrough/integration.test.js`
- [ ] `tests/request/response-json/api/get.js`
- [ ] `tests/request/response-json/integration.test.js`
- [ ] `tests/request/response-text/api/get.js`
- [ ] `tests/request/response-text/integration.test.js`
- [ ] `tests/request/route-dynamic/api/users/:userId/get.js`
- [ ] `tests/request/route-dynamic/integration.test.js`
- [ ] `tests/request/route-static/api/users/get.js`
- [ ] `tests/request/route-static/integration.test.js`
- [ ] `tests/validation/dynamic-route/api/users/:userId/meta.js`
- [ ] `tests/validation/dynamic-route/api/users/:userId/put.js`
- [ ] `tests/validation/dynamic-route/integration.test.js`
- [ ] `tests/validation/handlers-meta/api/users/meta.js`
- [ ] `tests/validation/handlers-meta/api/users/post.js`
- [ ] `tests/validation/handlers-meta/integration.test.js`
- [ ] `tests/validation/handlers-method/api/users/post.js`
- [ ] `tests/validation/handlers-method/integration.test.js`
- [ ] `tests/websocket/connect/api/ok/get.js`
- [ ] `tests/websocket/connect/integration.test.js`
- [ ] `tests/websocket/heartbeat-ack/api/ok/get.js`
- [ ] `tests/websocket/heartbeat-ack/integration.test.js`
- [ ] `tests/websocket/late-response-dropped/api/ok/get.js`
- [ ] `tests/websocket/late-response-dropped/api/slow-reply/get.js`
- [ ] `tests/websocket/late-response-dropped/integration.test.js`
- [ ] `tests/websocket/reconnect-after-drop/api/ok/get.js`
- [ ] `tests/websocket/reconnect-after-drop/integration.test.js`
- [ ] `tests/websocket/reconnect-reclaim/api/ok/get.js`
- [ ] `tests/websocket/reconnect-reclaim/integration.test.js`
- [ ] `tests/websocket/request-timeout/api/hang/get.js`
- [ ] `tests/websocket/request-timeout/integration.test.js`
- [ ] `tests/websocket/server-notification/api/ok/get.js`
- [ ] `tests/websocket/server-notification/integration.test.js`
- [ ] `tests/websocket/willing-close-terminal/api/ok/get.js`
- [ ] `tests/websocket/willing-close-terminal/integration.test.js`
