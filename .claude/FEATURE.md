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

**Timing:** the request-contract items below land *after* all of group 1
(through `index.ts`) and *before* group 2 (integration tests). Both
request builders only exist in TypeScript once their own modules
convert, so the real contract is not visible until then.

- [ ] **Design the request type hierarchy.** Establish a `BaseRequest`
      with the properties both variants share, and two types extending
      it. The middleware chain and middleware handlers should accept
      either.

      `BaseRequest`: `method` (HTTP method), `route` (URL route),
      `params` (dynamic route param values), `query` (parsed
      querystring), `headers` (a `Headers` instance), `json` (async,
      resolves the body to an object).

      `EndpointRequest` adds `server` (the underlying Bun server) and
      `raw` (the original `BunRequest`, if needed). Built by
      `buildEndpointRequest` at `index.js:71`.

      `WebSocketRequest` adds `id` and `clientId`. Built by
      `buildRequest` in `socket.ts`. (These two fields were read off
      the current implementation; the spec handed over left the
      WebSocket-specific list blank, so confirm they are the intended
      set.) It now exists as a concrete exported type in `socket.ts`,
      declared from what `buildRequest` actually returns, so this step is
      reduced to factoring out the shared `BaseRequest` core once
      `index.ts` reveals the endpoint side.

      The union is the point:

      ```ts
      type Request = EndpointRequest | WebSocketRequest
      ```

      and every chain entry then takes `req: Request`.

      Deliberately *not* `BunRequest`: the framework needs less than Bun
      provides and also attaches fields Bun does not have.

      This replaces `ValidatableRequest` in `middleware.ts`, which is a
      temporary stand-in covering only what that module happens to
      touch (`headers`, `params`, `query`, `json`), and it subsumes the
      `TReq` item below.

      **It also replaces `Record<string, unknown>` on
      `SocketEndpoint.handler`.** That stand-in exists because the
      handshake terminals genuinely receive either envelope: their
      `handler` is pushed into a normal route chain (`index.js:238` and
      `:254`), and chains run from two places, `index.js:274` with
      `buildEndpointRequest` output and `socket.ts:533` with
      `buildRequest` output. The two Ajv guards in `socket.ts` are doing
      union discrimination by hand: `CreateSocketRequest` requires
      `server` and `raw`, which only the endpoint envelope has, and
      `validateNotMessage` rejects anything carrying `clientId`, which
      only the WebSocket envelope has. Once `Request` exists, those
      become a real discriminated union and the `obj as T` cast inside
      `validateSchema` narrows instead of asserting.

      **Confirm the name before adopting it.** `Request` is a global
      (`lib.dom` / Bun), and a module-level `type Request` shadows it:
      verified that `new Request('http://x')` stops resolving to the
      global once the alias is declared, with `globalThis.Request` left
      as the escape hatch. No server module currently references the
      bare global type, so the shadowing costs nothing internally. The
      open question is the public surface, since `index.ts` re-exports
      the API and a consumer writing `import { Request } from
      'sleepy-serv'` would shadow the global in their own file. Either
      accept that or pick a prefixed name.

- [ ] **Tighten `TReq` in `utils.ts`.** `executeMiddlewareChain` is
      currently generic over an unconstrained `TReq` because `utils` only
      forwards the request and never inspects it. The two callers build
      different shapes: `index.js:71` (`buildBunRequest`) produces
      `{method, route, headers, params, query, raw, server, json}`, while
      `socket.ts` (`buildRequest`) produces
      `{id, clientId, method, route, headers, params, query, json}`,
      now named `WebSocketRequest`.
      The common core is `method`, `route`, `headers`, `params`, `query`,
      `json`. Once `socket.ts` and `index.ts` are converted (last two in
      group 1), that core can become a named base type with the generic
      constrained to it, or the generic can collapse into a union.
      Superseded by the request type hierarchy above: `TReq` should end
      up constrained to `BaseRequest`, or collapse into a
      `EndpointRequest | WebSocketRequest` union.
      Note: `utils.test.ts` uses `const REQ = { url: '/users' }`, which
      matches neither envelope (neither has a `url` field). It compiles
      today only because `TReq` is unconstrained, so tightening the
      constraint will correctly break it and the fixture will need a
      realistic shape.

- [ ] **Extract a validation-source builder in `validateSchemas`.**
      Low priority cleanup, not blocking anything. The per-key
      conditionals currently sit inline in the reduce
      (`middleware.ts:182-183`):

      ```ts
      const raw = key === 'body' ? res : req[key]
      const data = raw instanceof Headers
        ? Object.fromEntries(raw)
        : raw
      ```

      Replace with a helper that loops the keys actually present in
      `schemas` and returns an object already in validation-ready form:
      `body` pulled from `res`, `headers` as a POJO built from the
      request's `Headers` instance, `params` and `query` passed through.
      The validation loop then just reads `source[key]`, with no
      type-sniffing per iteration.

      Note the `instanceof Headers` check exists because the value's
      shape is not known statically. Doing this after the `BaseRequest`
      work may let the conversion key off the schema key alone, since
      `headers` will be typed as `Headers` on every request variant.

- [ ] **Resolve `next` nullability in built-in middleware.**
      `Middleware` types `next` as `MiddlewareNext | null` because
      `executeMiddlewareChain` really does pass `null` to the last entry.
      But `parseJsonBody` and `validateSchemas` call `next`
      unconditionally, since they are only valid in non-terminal
      position. That precondition is currently asserted with three
      `next as MiddlewareNext` casts in `middleware.ts` (lines 112, 121,
      173) rather than encoded. Options when revisiting: a runtime guard
      that throws a clear error, or splitting the chain-entry type so
      terminal handlers and middleware are distinct. Note a naive split
      fails under `strictFunctionTypes`, since a function taking
      non-null `next` is not assignable to one taking
      `MiddlewareNext | null`. Best settled alongside the `TReq`
      tightening, since both describe the same chain contract.

- [ ] **Decide whether `StatusCode` literals need pinning.** The deleted
      `status.test.ts` held a table test asserting all 62 members against
      their raw numbers, plus a uniqueness check. Nothing replaced it.
      `errors.test.ts` now asserts `StatusCode.NotFound` on both the
      expected and actual side, so a typo in `utils.ts` (say `NotFound:
      405`) would keep every test green and ship a wrong status code.
      Either restore the table test in `utils.test.ts` or accept that
      the numbers are unverified; leaving it undecided is the only bad
      option.

- [x] **Revisit error message intent.** Settled the same way for both
      classes the `socket.ts` conversion forced: `message` stays
      **required**, and the two bare throw sites were treated as the
      defect rather than as evidence the param should be optional.

      - `ServiceUnavailableError` on the ticket-pool cap in `bindTicket`
        now throws `'Unable to issue ticket'`.
      - `UnauthorizedError` on a reclaim token mismatch now throws
        `'Invalid token'`, matching the wording `tests/auth/auth.js:46`
        already uses for the same condition.

      Both are deliberate **behaviour changes**, and the only ones in the
      conversion. `output` returns `{ message }` when a message is set
      and `null` otherwise, so each response flipped from an empty body
      to JSON with a `content-type`. Tests updated accordingly:
      `socket.test.js` for the 503, and two integration suites that had
      pinned the 401 body to `null`
      (`tests/websocket/reconnect-reclaim` and
      `packages/server/tests/errors/request/ws-endpoints`).

      Still open: whether `UnsupportedMediaTypeError(subject)` and
      `InternalServerError(message, ctx)` keep their bespoke signatures,
      and whether `ctx` (written, never read) is vestigial.

- [ ] **Adopt Bun's own WebSocket types for `buildSocketServer`.**
      Lands with `index.ts`, since that is where `Bun.serve` is called.
      The names, confirmed against `bun-types@1.3.14`:

      - `WebSocketHandler<T>` is the type of the `websocket` property in
        the `Bun.serve` options. This is what `buildSocketServer` returns
        and what `SocketServer` currently stands in for. It has **no**
        generic default, so `T` must be supplied.
      - `ServerWebSocket<T = undefined>` is the socket instance handed to
        `open`/`close`/`message`. `SocketConnection` stands in for it.
      - `T` is `ws.data`, which for this app is `SocketData`.

      The generic is wider than it looks. `Bun.serve` declares
      `websocket: WebSocketHandler<WebSocketData>`, and that same
      `WebSocketData` parameter also flows into `Server<WebSocketData>`
      and `Routes<WebSocketData, R>`, so it is inferred once and unifies
      the socket handler, the `Server` passed to every route handler, and
      the `server.upgrade(req, ctx)` context. That makes this one
      decision spanning `socket.ts` and `index.ts`, not a local swap. It
      should be settled alongside `UpgradeContext` / `UpgradeData` and
      the `server.upgrade` signature inside `CreateSocketRequest`.

      Two things to weigh, both already verified:

      - **It buys less safety than it appears to.** Bun declares
        `message(ws, message)` with method shorthand, so its parameters
        are bivariant. A handler narrowing `raw` to `string` still
        assigns to `WebSocketHandler` with no error. Conforming to Bun's
        type does not by itself protect parameter fidelity; the current
        hand-written `SocketServer` uses arrow-property syntax and
        therefore *does* catch that drift (`TS2322`).
      - **It costs the test mocks.** `ServerWebSocket` has 20 members
        (`subscribe`, `publish`, `cork`, `readyState`, `remoteAddress`,
        and so on). `socket.test.js` drives the handlers with a
        four-property literal, which satisfies `SocketConnection` but
        would not satisfy `ServerWebSocket<SocketData>`. Switching means
        either a mock factory that fills in all 20 or keeping
        `SocketConnection` as the internal parameter type while the
        returned object conforms to `WebSocketHandler`.

      Already confirmed compatible today: the object `buildSocketServer`
      returns is assignable to `WebSocketHandler<SocketData>`, and
      `ServerWebSocket<SocketData>` is assignable to `SocketConnection`.
      So nothing is blocked, and this is a fidelity improvement rather
      than a fix.

- [ ] **Decide what an unvalidatable message echoes back.**
      `buildErrorMessage` in `socket.ts` runs on the catch path, which is
      reached *before* validation succeeds, so `id` and `clientId` are
      raw wire values. It reads them through
      `message as Pick<BaseMessage, 'id' | 'clientId'>`, which claims
      both are strings when they demonstrably need not be:
      `socket.test.js` sends a bare `{type: 'heartbeat'}` frame and the
      reply carries no `clientId` at all (`JSON.stringify` drops the
      `undefined`). This preserves the JavaScript behaviour exactly, but
      the cast is a knowing lie. The likely fix is not a better type: the
      socket already knows its authenticated identity as
      `ws.data.clientId`, so echoing a client-supplied one on a frame
      that failed validation is arguably the bug. Changing it is a
      behaviour change, hence deferred.

- [ ] **`RequestMessage.headers` is typed `Headers` but arrives as a
      POJO.** Every message type declares `headers: Headers`, which holds
      for messages the server *builds*. Inbound frames are
      `JSON.parse`d, so their `headers` is a plain object at runtime.
      Nothing breaks today (`buildRequest` does
      `new Headers(message.headers)`, and `HeadersInit` accepts both),
      but the type is wrong for exactly the direction that crosses the
      wire. Worth splitting inbound from outbound message types, or
      typing the field as `HeadersInit`, when the request hierarchy above
      is designed.

## 1. `server` implementation and unit tests

- [x] `packages/server/src/utils.js`
- [x] `packages/server/src/utils.test.js`
- [x] ~~`packages/server/src/meta.js`~~ deleted, not converted. It was a
      generic tree/object utility with zero production callers: nothing
      imported it but its own test, and it was never re-exported from
      `index.js`. Recoverable from git history if ever wanted.
- [x] ~~`packages/server/src/meta.test.js`~~ deleted with it (22 tests).
- [x] ~~`packages/server/src/status.ts`~~ folded into `utils.ts`. It was
      briefly its own module, but `StatusCode` has zero dependencies and
      `utils.ts` is already the home for dependency-free primitives, so a
      separate module bought nothing.
- [x] ~~`packages/server/src/status.test.ts`~~ deleted with it. See the
      deferred item on literal verification below.
- [x] `packages/server/src/errors.js` (getters return `StatusCode`)
- [x] `packages/server/src/errors.test.js`
- [x] `packages/server/src/middleware.js`
- [x] `packages/server/src/middleware.test.js`
- [x] `packages/server/src/messages.js` (`TYPES` becomes `MessageType`,
      atomic across `socket.js`, both test files, `tests/helpers.js`, and
      the `ws-message` integration test)
- [x] `packages/server/src/messages.test.js`
- [x] `packages/server/src/socket.js`
- [x] `packages/server/src/socket.test.js`. Both predicted blockers hit,
      and the `TestError` one turned out to be a real defect rather than
      a typing nuisance: its `static get status () { return 999 }` is not
      a valid HTTP status at all, and `new Response('', {status: 999})`
      throws `RangeError`. The fixture only worked because the WebSocket
      path puts the status into a JSON message instead of a `Response`;
      the same error over HTTP would have crashed the `Bun.serve` error
      hook. Now `StatusCode.ImATeapot`, which is still distinct from the
      500 default so the pass-through assertion keeps its meaning.
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
