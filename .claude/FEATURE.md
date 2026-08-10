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
- [ ] `packages/server/tsconfig.build.json` and `build:types` script.
      **Now unblocked**, since `index.ts` exists. `exports` was changed
      to `./src/index.ts` during that conversion because the E2E suites
      import `sleepy-serv` by package name and every one of them failed
      to resolve otherwise. That is the minimum to keep the workspace
      running, not the finished packaging story.
- [ ] Server `exports` conditions and `publish.yml` build step. Also
      unblocked. `exports` is still a bare string, so a TypeScript
      consumer typechecks our source under *their* tsconfig, which is
      the failure mode the `.d.ts` plan exists to prevent. Needs
      `{ "types": "./<declarationDir>/index.d.ts", "bun": "./src/index.ts",
      "default": "./src/index.ts" }`, the declaration output in
      `.gitignore`, and `build:types` running before the `--dry-run`
      pre-flight in `publish.yml`.

      Verified the tarball is otherwise correct today: 9 files
      (LICENSE, README, package.json, 6 `.ts` sources), no test files
      leaked through the `files` allowlist. Down from 7 sources to 6
      because `meta.js` was deleted and `status.ts` folded into
      `utils.ts`.
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

- [x] **Design the request type hierarchy.** Done, per the handed-over
      spec. All four types live in `utils.ts`, the dependency root, so
      no module needs a type-only import cycle:

      ```ts
      BaseRequest      method, route, headers, params, query, json
      EndpointRequest  BaseRequest & { raw, server }
      WebSocketRequest BaseRequest & { id, clientId }
      Request          EndpointRequest | WebSocketRequest
      ```

      `Middleware` is no longer generic; it is
      `(req: Request, res: unknown, next: NextFn | null) => unknown`.
      `RouteMiddleware` is gone, subsumed by it.

      Cost: 105 type errors, 104 of them test fixtures, which is the
      point. `utils.test.ts` really did have `REQ = { url: '/users' }`
      matching neither envelope. `middleware.test.ts` fixtures now
      spread a `BASE_REQUEST`, so each test states only the fields it
      exercises. `socket.test.ts` binds the three handshake terminals
      through a local `LooseHandler` type, because those suites
      deliberately feed malformed input to the validators; that is one
      cast for the file instead of 67 at the call sites.
- [x] **Tighten `TReq` in `utils.ts`.** Resolved by the above, more
      completely than planned: the generic did not need constraining, it
      needed removing. `executeMiddlewareChain (req: Request, chain:
      Middleware[])` is now concrete.
- [x] **Extract a validation-source builder in `validateSchemas`.**
      Done. `buildValidationSource(req, res)` returns the four keys
      already in validation-ready form, so the reduce is now just
      `validator(source[key])` with no per-iteration type sniffing. The
      `instanceof Headers` check is gone: now that `BaseRequest.headers`
      is a `Headers` on every variant, `Object.fromEntries(req.headers)`
      is unconditional.
- [x] **Resolve `next` nullability in built-in middleware.** Replaced
      the three `as NextFn` casts with a `requireNext()` guard that
      throws `TypeError('Middleware cannot be the last entry in a
      chain')`. Chose the runtime guard over splitting the chain-entry
      type because, as noted, a naive split fails under
      `strictFunctionTypes`. Two tests cover the new branch, keeping
      `middleware.ts` at 100%.
- [x] **Decide whether `StatusCode` literals need pinning.** Restored
      into `utils.test.ts`, where `StatusCode` now lives. Verified it
      earns its place by mutation: with `NotFound: 405`, both new tests
      fail (the table, and uniqueness, since 405 then collides with
      `MethodNotAllowed`) while `errors.test.ts` still passes. The gap
      was real.
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

- [x] **Rename `FMT` to `Fmt`.** Done in two passes across
      `packages/server/tests`: the alias and its 53 references, then the
      members from SCREAMING_SNAKE to PascalCase (`Fmt.Text`,
      `Fmt.Json`), which brings it in line with `MessageType.Welcome`
      and `StatusCode.Ok`. This entry previously claimed "the members
      are already correct, only the alias name is off"; that was wrong.
      **The values stay lowercase, and this is enforced, not stylistic.**
      `deserializeBody` does `res[fmt]()`, so a value must be a real
      `Response` method name. Mutating `Json: 'json'` to `Json: 'Json'`
      fails with TS2551. That makes `Fmt` different in kind from
      `MessageType` and `StatusCode`, whose values we choose: here an
      external API pins them, and only the member identifiers are ours.
      Renaming members needed anchored `Fmt.JSON` patterns rather than a
      bare `JSON`, since the package has 27 `JSON.parse`/`JSON.stringify`
      calls that a naive pass would have destroyed.

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

- [x] **Decide what an unvalidatable message echoes back.** Attempted,
      then reverted, and promoted to
      [`.claude/todos/bad-client-id.md`](./todos/bad-client-id.md).

      `buildErrorMessage` was changed to use `ws.data.clientId`. That is
      defensible for the catch path in isolation, but it left the
      success path still echoing the client-supplied value, so the two
      disagreed. Verifying it also surfaced the larger issue: nothing
      checks that an inbound frame's `clientId` belongs to the socket it
      arrived on, because `validateMessage` only checks uuid *format*.

      That is a protocol decision, not a conversion one, so it is out of
      scope here and tracked separately. Current behaviour is unchanged
      from the JavaScript: both paths echo whatever the client sent, and
      the `as Pick<BaseMessage, ...>` cast stays.
- [x] **`RequestMessage.headers` is typed `Headers` but arrives as a
      POJO.** Now `Bun.HeadersInit`, which covers both directions: a
      `Headers` when the message is built, a plain object when it is
      parsed off the wire. The other three message types stay `Headers`,
      since they are only ever constructed server-side. Note the bare
      `HeadersInit` global is not in scope under
      `lib: ["ESNext"]` without DOM; Bun namespaces it.
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
- [x] `packages/server/src/index.js` (no unit test file)
- [x] `test-setup.js` (root, cross-cutting Bun test preload). Also
      updated its two `bunfig.toml` references (`preload` and the
      coverage ignore entry) and added it to the server tsconfig's
      `include`, alongside `types/`, so it is actually type-checked;
      being at the repo root it fell outside every `include` otherwise.
      Verified the preload is load-bearing: pointed at a nonexistent
      path, the suite produces no results at all.

## 2. `server` integration tests (`packages/server/tests/`)

- [x] `packages/server/tests/helpers.js` (shared). `FMT` gained
      `as const` plus a derived type, which surfaced that `FMT.NONE` was
      both unused across all 84 call sites and non-functional:
      `res['none']()` would throw, since `Response` has no `none`
      method. Removed. "Use the default" is now expressed by passing
      `null`, so `deserializeBody` takes `FMT | null`; verified all 28
      requestor calls already pass an explicit format, so making it
      required cost no call-site churn.
      `HttpResult.body` is `unknown`, so each suite narrows as it
      converts. `Bun.BodyInit` for the same reason `Bun.HeadersInit` was
      needed: the bare DOM globals are out of scope under
      `lib: ["ESNext"]`.
- [x] `packages/server/tests/errors/initialization/leaf-directory-has-no-method-file/api/users/meta.js`
- [x] `packages/server/tests/errors/initialization/leaf-directory-has-no-method-file/integration.test.js`
- [x] `packages/server/tests/errors/initialization/method-file-has-no-default-export/api/get.js`
- [x] `packages/server/tests/errors/initialization/method-file-has-no-default-export/integration.test.js`
- [x] ~~`packages/server/tests/errors/initialization/whitelist-supported-file/`~~
      deleted, not converted. It tested the `whitelist` option, which
      commit `689c858` ("Removed deprecated feature: 'illegal file
      whitelist'", 30 commits back) deleted from `index.js` along with
      the sibling `unsupported-file-to-api-directory` suite. This
      directory was missed.

      It survived because the assertion could not fail:
      `expect(fn).not.toThrow(...)` on an `async` function never
      observes the rejection, and the error string it named
      (`"Directory contains illegal files:"`) had been deleted with the
      feature. Confirmed by removing the only method file, which makes
      `createApp` reject outright; the test still reported 1 pass. The
      dead `whitelist` option rode along because plain JavaScript
      ignores unknown keys, so only the `AppOptions` check surfaced it.
- [x] `packages/server/tests/errors/request/middleware-throws-error/api/get.js`
- [x] `packages/server/tests/errors/request/middleware-throws-error/integration.test.js`
- [x] `packages/server/tests/errors/request/no-Response-object-returned/api/get.js`
- [x] `packages/server/tests/errors/request/no-Response-object-returned/integration.test.js`
- [x] `packages/server/tests/errors/request/not-allowed-method/api/users/post.js`
- [x] `packages/server/tests/errors/request/not-allowed-method/integration.test.js`
- [x] `packages/server/tests/errors/request/not-found-resource/api/users/get.js`
- [x] `packages/server/tests/errors/request/not-found-resource/integration.test.js`
- [x] `packages/server/tests/errors/request/throws-RequestError/api/get.js`
- [x] `packages/server/tests/errors/request/throws-RequestError/integration.test.js`
- [x] `packages/server/tests/errors/request/throws-generic-error/api/get.js`
- [x] `packages/server/tests/errors/request/throws-generic-error/integration.test.js`
- [x] `packages/server/tests/errors/request/ws-endpoints/api/get.js`
- [x] `packages/server/tests/errors/request/ws-endpoints/integration.test.js`
- [x] `packages/server/tests/errors/request/ws-message/api/get.js`
- [x] `packages/server/tests/errors/request/ws-message/integration.test.js`
- [x] `packages/server/tests/middleware/all-levels/api/meta.js`
- [x] `packages/server/tests/middleware/all-levels/api/users/get.js`
- [x] `packages/server/tests/middleware/all-levels/api/users/meta.js`
- [x] `packages/server/tests/middleware/all-levels/integration.test.js`
- [x] `packages/server/tests/middleware/app-level/api/users/get.js`
- [x] `packages/server/tests/middleware/app-level/integration.test.js`
- [x] `packages/server/tests/middleware/meta-level-parent/api/meta.js`
- [x] `packages/server/tests/middleware/meta-level-parent/api/users/get.js`
- [x] `packages/server/tests/middleware/meta-level-parent/integration.test.js`
- [x] `packages/server/tests/middleware/meta-level-sibling/api/users/get.js`
- [x] `packages/server/tests/middleware/meta-level-sibling/api/users/meta.js`
- [x] `packages/server/tests/middleware/meta-level-sibling/integration.test.js`
- [x] `packages/server/tests/middleware/meta-no-middleware/api/users/get.js`
- [x] `packages/server/tests/middleware/meta-no-middleware/api/users/meta.js`
- [x] `packages/server/tests/middleware/meta-no-middleware/integration.test.js`
- [x] `packages/server/tests/middleware/module-level/api/users/get.js`
- [x] `packages/server/tests/middleware/module-level/integration.test.js`
- [x] `packages/server/tests/request/querystring/api/get.js`
- [x] `packages/server/tests/request/querystring/integration.test.js`
- [x] `packages/server/tests/request/route-dynamic/api/users/:userId/get.js`
- [x] `packages/server/tests/request/route-dynamic/integration.test.js`
- [x] `packages/server/tests/request/route-resource/api/users/get.js`
- [x] `packages/server/tests/request/route-resource/integration.test.js`
- [x] `packages/server/tests/request/route-root/api/get.js`
- [x] `packages/server/tests/request/route-root/integration.test.js`
- [x] `packages/server/tests/url/custom-host/api/get.js`
- [x] `packages/server/tests/url/custom-host/integration.test.js`
- [x] `packages/server/tests/url/mount-path/api/users/get.js`
- [x] `packages/server/tests/url/mount-path/integration.test.js`

## 3. `client` implementation and unit tests

### Config work (precedes any source conversion)

- [x] `packages/client/tsconfig.json` (`types: ["bun"]`, DOM lib, all of
      `src/**/*` including tests)
- [x] `packages/client/tsconfig.portable.json` (the portability gate:
      `types: []`, tests excluded via `src/**/*.test.*`, matching the
      `files` field's negation so the pattern holds for both extensions
      during the mixed `.js`/`.ts` window). Verified load-bearing by
      mutation:
      `node:crypto` → TS2307, `Bun.version` → TS2868, `process.env` →
      TS2591, all three clean under `tsconfig.json`; and the `exclude`
      proven by planting a type error in a `*.test.ts`.
- [x] `engines: { "node": ">=22" }` on the client. Global `WebSocket` is
      the binding constraint; the package stays dependency-free.
- [x] `typecheck` script on the client, running both configs.
- [x] Root `typecheck` script (`bun run --filter '*' typecheck`).
      Confirmed to propagate a nonzero exit code.
- [x] `dist` build wiring. Resolved by shipping **both** trees under a
      conditional `exports`: `bun` resolves `./src/index.ts`, `default`
      resolves `./dist/index.js`, `types` resolves
      `./dist/index.d.ts`. The alternative, `dist` only, would have put
      a build step in front of every `bun test` and let a stale `dist`
      pass silently.
      Landed: `tsconfig.build.json` (extends the **portable** config, so
      the compiled subset is the portable one), a `build` script,
      `dist/` in `.gitignore` and in the ESLint ignore list, and
      `Typecheck` + `Build client` steps in `publish.yml` ahead of the
      registry pre-flight.
      **One source change was forced by this:** relative imports in
      `packages/client/src` now carry `.js` extensions. TypeScript emits
      specifiers verbatim, so extensionless imports produced a `dist`
      that Node rejects with `ERR_MODULE_NOT_FOUND`, which is the exact
      failure the compiled output exists to prevent. Verified against
      Node 24 both before and after.
      Verified end to end: the packed tarball was extracted and
      typechecked from a simulated consumer under `strict` with
      `types: []`, and mutations confirm the declarations bite.

### Follow-ups raised during group 3

- [x] **`packages/server/tests/helpers.ts` `Frame` naming** is resolved:
      `MessageFrame` became `BaseMessage`, `ResponseFrame` became
      `ResponseMessage`, and `Frame` was replaced by `AnyMessage`
      (`BaseMessage | ResponseMessage`), which is what `sendRaw` can
      return: an ack or a full response.
- [ ] **Nothing pins the `Queue` values.** Mutating `Fifo: 'fifo'` to
      `'fifoo'` fails zero tests, since every test reaches them through
      the constant. `MessageType` fails 46 under the same treatment.
      `Queue` is the union `'none' | 'fifo' | 'lifo'`, so a consumer may
      pass a raw string and a value change would break them silently.
      Best addressed alongside `index.test.js`.

### Source and unit tests

> **Publish hazard: CLOSED.** For most of group 3 the client was in a
> transitionally broken publish state, shipping a `src` tree whose
> entry point imported a `.ts` file that Node and browsers cannot
> resolve. The `dist` build wiring above closes it, and a simulated
> consumer now typechecks against the packed tarball. Kept here because
> the shape of the hazard recurs: any window where `files` ships a tree
> the target runtime cannot load is invisible to `bun test`, since Bun
> resolves everything happily. `npm pack --dry-run` is what catches it.

- [x] `packages/client/src/utils.js` (exports an `IdGenerator` type;
      `setIdGenerator` is public API via `export * from './utils'`)
- [x] `packages/client/src/utils.test.js` (needed `mock<IdGenerator>()`;
      a bare `mock()` falls back to its `(...args: any[]) => any`
      constraint and made the `setIdGenerator` assertion vacuous)
- [x] `packages/client/src/messages.js` (`TYPES` becomes `MessageType`,
      a public breaking change). Landed atomically across 29 files: the
      module itself, `index.js`, both client test files, and the 25 root
      E2E files, 108 occurrences in all. Members went PascalCase to
      match the server; the five wire values are byte-identical to
      `packages/server/src/messages.ts`, verified by diffing the two
      sorted value sets. Mutating one value fails 46 tests, so the
      strings are genuinely exercised rather than merely present.
      `README.md:267-269` came out correct from the mechanical rename;
      `websocket.md:5,7` were already converted during the server work,
      and `:112` had a stale parenthetical about the client "still
      spelling this `TYPES.HEARTBEAT`" that is now removed.
      **No version bump.** The plan called for one, but
      [`publishing.md`](./kbase/operations/publishing.md) is explicit
      that entries accumulate under `## [Unreleased]` and the release
      workflow promotes the heading and bumps versions. Bumping by hand
      here would collide with that. A CHANGELOG entry was added instead.
- [x] `packages/client/src/messages.test.js`. One real content change:
      `new Headers({ a: 1 })` passed a number where `HeadersInit`
      requires `Record<string, string>`. Behaviour-identical either way,
      since `Headers` coerces values to strings (verified at runtime:
      both spellings yield `[["a","1"]]`), so this was a latent type
      error the tests could never have caught. Probed the rest of the
      file rather than trusting the clean pass: a bogus message type,
      a numeric `clientId`, a numeric `opts.id`, and numeric
      `opts.headers` are all rejected. An arbitrary extra `opts` key is
      accepted, which is the `[key: string]: unknown` passthrough
      working as intended, not a gap.
- [x] `packages/client/src/index.js`. Exports the authoring types
      (`ConnectOptions`, `ReconnectOptions`, `RequestOptions`,
      `ResponseMessage`, `NotificationMessage`, `EventHandler`,
      `TicketData`); `ReconnectConfig` and `DispatchedMessage` stay
      module-private since neither appears in a public signature.
      `exports` flipped to `./src/index.ts`, without which all 31 E2E
      suites fail to resolve `sleepy-socket` (confirmed: 31 failures
      before the flip, 0 after). Seven `!` assertions survive, each
      individually proven required by removing it and re-running `tsc`;
      an eighth was decorative and deleted. See
      [typescript.md](./kbase/style/typescript.md).
      **Two judgement calls worth review:**
      (1) `#openSocket` now captures `const socket = new WebSocket(...)`
      and its handlers close over that local rather than re-reading
      `this.#socket`. This removes five assertions, but it is a real
      behaviour change in one narrow case: if a reconnect swapped
      `this.#socket` between handler registration and the welcome frame,
      the old code would detach the listener from the *new* socket. The
      local is more correct, but it is not a pure annotation.
      (2) `QUEUE` became `as const` with a derived type here, then was
      renamed to `Queue` with PascalCase members in the follow-up
      commit, bringing the last enum-like object in line with
      `MessageType`, `StatusCode`, and `Fmt`.
- [x] `packages/client/src/index.test.js`. 154 initial errors, resolved
      structurally rather than site by site: typing `connectAndOpen`'s
      return cleared 52 at once, and a `lastSocket()` accessor that
      throws on a missing socket cleared the rest of the null noise.
      `MockWebSocket` and the fetch stub implement only the surface the
      client touches, so both are installed through explicit casts;
      filling in `preconnect`, `binaryType`, and `CONNECTING` would be
      dead code no test can reach. Two `@ts-expect-error` markers cover
      the tests that deliberately pass invalid input (`queue: 'nope'`,
      `headers: {}`) to exercise runtime guards, so they now fail if
      those inputs ever become type-legal. One fidelity fix: the
      `response()` double omitted `clientId`, which a real server
      response always carries, so it was added rather than making
      `ResponseMessage.clientId` optional.

## 4. E2E tests (root `tests/`)

### Group 4 setup

- [x] Root `tsconfig.json` covering `tests/**/*`, wired into the root
      `typecheck` script. Nothing had covered these 82 files before, so
      converting them without this would have produced `.ts` that was
      never typechecked. Maps both packages through `paths` to their
      **source**, so the typecheck needs no prior build and checks what
      actually runs. See
      [typescript.md](./kbase/style/typescript.md) for why the resulting
      double-check of the client is a feature, not redundancy.

- [x] `tests/helpers.js`. `FMT` became `Fmt` with PascalCase members, 80
      occurrences across 24 files, anchored on `Fmt.JSON` so the 16
      `JSON.parse` / `JSON.stringify` calls survived (verified before
      and after). Values stay lowercase: `res[fmt]()` needs real
      `Response` method names.
      Dropped the dead `NONE: 'none'` member, which no E2E test used and
      which would have thrown as `res.none()`.
      Also dropped the implicit `fmt ?? 'json'` default in
      `deserializeBody`. Exactly one call site relied on it,
      `req.get('/protected')` in the auth suite, and the very next test
      in that file already spelled out `FMT.JSON` for the same route, so
      the call is now explicit and `fmt` is required.
      **Two dead helper methods left in place, not deleted:** nothing
      calls `req.head()` or `req.options()`. `options` is the odder one,
      since `HttpMethod` has no `OPTIONS` member, so no route file can
      ever serve it; it is typed through a local
      `RequestMethod = HttpMethod | 'OPTIONS'` that says so. Worth a
      decision, but deleting them is not part of a conversion.
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
