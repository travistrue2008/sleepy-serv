# TypeScript

Conventions and per-decision rationale for the incremental JavaScript to
TypeScript migration. Per-file progress lives in
[`.claude/FEATURE.md`](../../FEATURE.md).

## Toolchain

### Why `typescript` is a dependency at all

- **Choice:** `typescript` is a root `devDependency`, even though Bun
  runs `.ts` natively.
- **Rationale:** Bun's transpiler *strips* types, it does not *check*
  them. A genuine type error runs to completion under Bun: passing a
  string into a `number` parameter yields a silent string concatenation
  and exit 0. `tsc --noEmit` is the only thing that catches it. Bun also
  cannot emit `.d.ts` (`bun build` has no declaration flag), which the
  publishing model requires.
- **Consequence:** There is still no build step to *run* anything.
  `tsc` is only ever invoked with `--noEmit`, and later
  `--emitDeclarationOnly` for publishing.

### TypeScript version ceiling

- **Choice:** `typescript` is constrained to `^5.9.3`.
- **Rationale:** `bun add -d typescript` resolves TypeScript 7 (the
  native port), but `typescript-eslint@8.x` peer-requires
  `>=4.8.4 <6.1.0`. Installing 7.x produces peer warnings and puts the
  linter on an unsupported compiler, which matters because the ban on
  `any` is enforced entirely through ESLint.
- **Revisit:** When typescript-eslint supports 7.x. The peer range
  already allows 6.x, so the wall is 7.x specifically.

### Banning `any`

- **Choice:** `@typescript-eslint/no-explicit-any` set to `error`.
- **Rationale:** `tsc` has no compiler flag for this. `strict` and
  `noImplicitAny` only catch *implicit* `any` from missing annotations;
  writing `: any` explicitly is always legal to the compiler. ESLint is
  the only enforcement point, which is why TS-aware lint config was
  introduced before any source file was converted.
- **Prefer `unknown`.** It forces narrowing at the use site instead of
  disabling checking.

### Config layout

- **Choice:** `tsconfig.base.json` at the root sets no `lib` and no
  `types`.
- **Rationale:** The base must stay runtime-neutral so both packages can
  extend it. The server is Bun-only (`lib: ["ESNext"]` without `DOM`,
  `types: ["bun"]`), while the client must stay portable across browser,
  Node, and Bun. Baking either runtime into the base would leak the
  wrong globals into the other package.
- **`allowJs: true` with `checkJs: false`** lets `.js` and `.ts` coexist
  for the whole migration. Untouched `.js` files are parsed but never
  type-checked, so they keep running with zero errors.

### `bun run typecheck` is the source of truth, not the editor

- **The whole check is** `bun run typecheck` from the repo root: the root
  config, then every workspace member's own script, which for the client
  includes the portable gate. Seven `tsconfig*.json` files now exist with
  deliberately different `include` sets, so "my editor is quiet" and
  "the repo typechecks" are not the same statement.
- **No `typescript.tsdk` is pinned** and the repo carries no `.vscode/`
  directory, so an editor runs whatever TypeScript it bundles rather than
  the workspace's `5.9.3`. Editor diagnostics disagreeing with the CLI is
  therefore expected rather than surprising, and the CLI wins. Restarting
  the TS server clears the common case, which is stale state after
  concurrent edits.
- **Prove a clean run is not a vacuous one.** With this many configs, a
  file silently falling outside every `include` looks identical to a file
  with no errors. Plant a deliberate type error in the file under
  question, confirm `tsc` reports it, then revert. This is the same
  discipline as the [`mock()`
  rule](#a-bare-mock-types-as-any-so-pass-it-a-type-argument), applied to
  configs rather than to assertions.

### The root E2E config typechecks the packages a second time, on purpose

- **Setup:** `tsconfig.json` at the repo root covers `tests/**/*` with
  `lib: ["ESNext"]` and `types: ["bun"]`, and maps `sleepy-serv` and
  `sleepy-socket` through `paths` to their **source**, not their build
  output.
- **Why `paths` rather than package resolution.** `sleepy-socket`'s
  `exports` sends the `types` condition to `./dist/index.d.ts`, so
  without a mapping the root typecheck would require a build first, and
  a stale `dist` would be typechecked instead of the source. Mapping to
  source also matches what actually runs, since Bun resolves the same
  package through its `bun` condition to `./src/index.ts`.
- **The side effect is the valuable part.** The client is normally
  checked under `lib: ["DOM"]`; the root config checks that same source
  under Bun's lib. Where the two disagree, the stricter one wins and a
  real hole shows up.
- **What it caught immediately:** DOM declares `Response.json()` as
  `Promise<any>`, Bun declares it `Promise<unknown>`. The client's
  `#createTicket` and `#reclaimTicket` did `return response.json()`
  against a `Promise<TicketData>` signature. Under the client's own
  config that is an unchecked `any` flowing straight into a typed
  return; under the root config it is a TS2322. Both now cast
  explicitly at the network trust boundary.
- **Note that `no-explicit-any` cannot catch this class of bug.** The
  `any` originates in `lib.dom.d.ts`, not in our source. Only checking
  the same code under a second lib surfaces it.

### Relative imports in the client carry a `.js` extension

- **Rule:** every relative specifier in `packages/client/src` is written
  `./utils.js`, not `./utils`, even though the file on disk is
  `utils.ts`.
- **Why:** TypeScript emits module specifiers *verbatim*. Extensionless
  imports compile to extensionless imports, and Node's ESM resolver
  requires the extension, so `dist/index.js` fails at import time with
  `ERR_MODULE_NOT_FOUND`. Confirmed against Node 24 before the fix.
  That failure is precisely what the compiled `dist` exists to prevent,
  so shipping it would have defeated the build.
- **This does not affect Bun.** `Bun.resolveSync('./messages.js', …)`
  returns `messages.ts`; the `.js` specifier is the standard way to
  refer to a TypeScript file that will be compiled.
- **Scope:** source only. The `*.test.ts` files keep extensionless
  imports, since they are excluded from the build and only ever run
  under Bun.
- The server needs none of this, because it ships `.ts` source and never
  compiles.

### The client compiles, the server does not

- **Choice:** `sleepy-socket` builds to `dist/` via
  `tsconfig.build.json`, and publishes both `dist` and `src` under a
  conditional `exports` map: `bun` resolves the TypeScript source,
  `default` resolves the compiled ESM, `types` resolves the emitted
  declarations.
- **Why the asymmetry with the server.** `sleepy-serv` calls
  `Bun.serve`, so every consumer necessarily runs Bun and shipping `.ts`
  carries no risk. The client's whole point is browser and Node support,
  and neither transpiles TypeScript out of `node_modules`.
- **Why both trees ship.** Pointing `default` at `dist` alone would mean
  the workspace's own E2E suites resolve compiled output, so `bun test`
  would need a build first and a stale `dist` could silently pass. The
  `bun` condition keeps the dev loop on source. It also makes the
  emitted `.js.map` and `.d.ts.map` useful, since both reference
  `../src/index.ts`, which is present in the tarball.
- **`tsconfig.build.json` extends `tsconfig.portable.json`,** not the
  editor config. The thing being compiled must be the portable subset:
  no Bun globals, no test files.
- **Verified end to end**, not assumed: the packed tarball was extracted
  and typechecked from a simulated consumer under `strict` with
  `types: []`. Mutations confirm the declarations are real, with
  `queue: 'nope'`, `client.secure`, and the old `TYPES` export each
  failing to compile.
- **`dist/` is gitignored and ESLint-ignored.** The lint ignore matters:
  without `**/dist/**`, `bunx eslint .` reports 798 style errors against
  generated output.

### The client ships two configs, the server one

- **Problem:** `sleepy-socket` must run in a browser, in Node, and in
  Bun, but its own tests import `bun:test`. A single config with
  `types: ["bun"]` makes Bun and Node globals visible to *source* files,
  so an accidental `Bun.serve` or `process.env` would typecheck clean
  and only fail in a browser consumer's bundle.
- **Choice:** Two configs in `packages/client`.
  - `tsconfig.json` includes all of `src/**/*` with `types: ["bun"]`.
    This is what editors pick up, so test files typecheck normally.
  - `tsconfig.portable.json` is the enforcement gate: same `lib`, but
    `types: []` and `exclude: ["src/**/*.test.ts"]`.
- **Why `types: []` is the mechanism.** It stops `@types/node` and
  `@types/bun` from loading, so `node:*` specifiers fail to resolve and
  `Bun`/`process` become unresolved names. Portability becomes a compile
  error rather than a runtime surprise.
- **`lib: ["ESNext", "DOM", "DOM.Iterable"]` is what makes this
  workable.** The client's four globals (`WebSocket`, `fetch`,
  `Headers`, `crypto.randomUUID`) all come from `DOM`, so the portable
  config needs no `@types` package at all. Verified: `DOM` plus
  `types: ["bun"]` coexist without duplicate-global conflicts, so the
  two configs differ only in `types` and `exclude`.
- **Verified load-bearing**, not assumed. Under the portable config,
  `node:crypto` fails with TS2307, `Bun.version` with TS2868, and
  `process.env` with TS2591; all three pass under `tsconfig.json`. The
  `exclude` was separately proven by planting a type error in a
  `*.test.ts` file and confirming only `tsconfig.json` reports it.
- The server needs no equivalent, because `Bun.serve` structurally
  guarantees every consumer runs Bun. Portability is not a goal there,
  so there is nothing to gate.

### `types/bun-test.d.ts`

- **Problem:** `bun-types@1.3.14` declares `toHaveBeenCalled`,
  `toHaveBeenCalledTimes`, and `toHaveBeenCalledWith`, but omits
  `toHaveBeenCalledOnce`. The matcher exists at runtime.
- **Choice:** Augment the `Matchers` interface via the extension point
  Bun documents in `bun-types/test.d.ts`, rather than rewriting
  assertions to `toHaveBeenCalledTimes(1)`.
- **Rationale:** [`writing-tests.md`](../../rules/writing-tests.md)
  mandates `toHaveBeenCalledOnce`. Degrading test assertions to work
  around a missing type declaration is backwards. The augmentation is
  surgical: a nonexistent matcher is still rejected.
- **Scope:** Lives at the repo root because both packages need it, and
  is pulled in through each package's `include`.
- **Revisit:** Delete once bun-types ships the declaration upstream.

### Import order: `import type` last

- **Choice:** `import type` statements go below all regular imports,
  separated by a blank line.
- **Rationale:** Value imports are what the module actually pulls in at
  runtime; type imports are erased entirely. Keeping them last puts the
  runtime dependency list first and makes the erased portion visually
  separable.
- **Not enforced by ESLint.** The repo has no import-ordering rule at
  all, so the existing external-then-internal grouping is convention
  too. Adding `eslint-plugin-import` for this one rule was considered
  and rejected: it is a new dependency, and it would conflict with
  editor "organize imports" behavior, which hoists type imports to the
  top. Check placement after saving.

## Typing decisions

### The request hierarchy, and why `Middleware` is not generic

- **Choice:** four types in `utils.ts`, the dependency root:

  ```ts
  BaseRequest      method, route, headers, params, query, json
  EndpointRequest  BaseRequest & { raw, server }
  WebSocketRequest BaseRequest & { id, clientId }
  Request          EndpointRequest | WebSocketRequest
  ```

  `Middleware` is `(req: Request, res, next) => unknown`, with no type
  parameter, and `executeMiddlewareChain` is concrete.
- **Why they all live in `utils.ts`.** The import graph is a DAG rooted
  at `utils`, so `Request` has to be declared there or the modules that
  build the two variants would need type-only cycles. `EndpointRequest`
  needs `BunRequest` and `Server<SocketData>`, which is why `SocketData`
  and the `Server` alias live in `utils` too.
- **Why the generic went away rather than getting a constraint.** The
  earlier `executeMiddlewareChain<TReq>` existed because `utils` only
  forwards the request and never inspects it. That was honest while the
  two envelopes were unnamed. Once both exist, the union says the same
  thing with less machinery, and it says it in one place instead of at
  every instantiation.
- **What it cost, and why that was the point.** 105 type errors, 104 in
  test fixtures. `utils.test.ts` had `REQ = { url: '/users' }`, a shape
  neither envelope has ever produced. `middleware.test.ts` fixtures now
  spread a `BASE_REQUEST` so each test states only the fields it
  exercises.
- **Where a loose type is still correct.** `socket.test.ts` binds the
  three handshake terminals through a local `LooseHandler`
  (`(req: Record<string, unknown>, res: unknown) => Response`). Those
  suites exist to prove the terminals reject malformed input, so the
  fixtures must be malformed. One cast for the file beats 67 at the call
  sites, and it names the intent.

### `Middleware` returns `unknown`

- **Choice:** `Middleware` is typed as returning `unknown`, not
  `Response | Promise<Response>`.
- **Rationale:** Middleware is user-authored and can return anything.
  The `result instanceof Response` check in `executeMiddlewareChain`
  exists precisely to catch handlers that fail to return one (see
  [Request Flow](../architecture/request-flow.md)). Typing the return as
  `Response` would make the compiler treat that check as redundant and
  the `else` branch as unreachable, quietly deleting the reason the
  check exists. `unknown` keeps it meaningful and narrows correctly.

### `ValidationError` is `Partial<ErrorObject>`

- **Choice:** `formatError`'s input is `Partial<ErrorObject>`, imported
  type-only from `ajv`.
- **Rationale:** All four call sites pass Ajv validator output
  (`middleware.ts`, `messages.ts`, and `socket.ts` twice), so the input
  really is an Ajv error. `Partial<>` is what allows the unit tests to
  pass minimal `{instancePath, message}` literals, since a bare
  `ErrorObject` also requires `keyword`, `schemaPath`, and `params`.
- **Why not an index signature:** `{instancePath?, message?, [key:
  string]: unknown}` also compiles, but it silently accepts a
  misspelled `instancPath`. `Partial<ErrorObject>` rejects it with a
  "did you mean" suggestion.
- **Note:** `import type` is fully erased, so nothing is added to the
  runtime module graph.

### Explicit return types on exported functions, including `: void`

- **Choice:** Exported functions carry an explicit return type even when
  it is `void`. Module-internal functions may rely on inference.
- **Rationale:** Inference is correct here; an unannotated function with
  no return statements emits `: void` in the declaration file. The
  annotation is a tripwire, not a correction. Adding a `return value`
  later is a compile error when annotated (`TS2322`) and completely
  silent when not, where it instead rewrites the published `.d.ts`
  signature.
- **Why it matters here specifically:** `sleepy-serv` ships generated
  declarations, so an inferred return type means the public contract is
  derived from whatever the body happens to do today. Annotating turns
  an accidental API change into a build failure.
- Applies to all return types, not just `void`. `void` is simply the
  case where inference is dependable enough that the annotation looks
  redundant, which is what makes the silent-change risk easy to miss.

### Do not add unreachable defensive fallbacks

- **Choice:** `validateSchemas` uses `validator.errors!.map(...)` rather
  than `(validator.errors ?? []).map(...)`.
- **Rationale:** Ajv types `errors` as `null | ErrorObject[] |
  undefined`, but its contract is narrower: verified that it sets
  `null` when validation passes and a non-empty array when it fails. The
  `??` branch is therefore unreachable, and unreachable branches cannot
  be tested.
- **The stronger reason:** if that branch *were* somehow reached, it
  would spread nothing, leave the error array empty, skip the
  `errors.length > 0` throw, and call `next(res)`. Invalid input would
  silently pass validation. The non-null assertion instead produces a
  loud `TypeError`. When an invariant is genuinely guaranteed, asserting
  it fails safely; papering over it with a default fails dangerously.
- **General principle:** reach for a fallback only where the fallback
  value is *correct* for the case it handles. If it is merely a way to
  satisfy the compiler, assert the invariant instead.

### `FormattedError.message` is required, not optional

- **Choice:** Both `path` and `message` are required, with
  `formatError` falling back to `''` when Ajv supplies no message.
- **Rationale:** `validateSchemas` produces a flat array of these, and
  every element must have the same shape. An optional `message` is not
  merely a loose type: `UnprocessableContentError` serializes via
  `JSON.stringify`, which **drops undefined-valued keys entirely**, so a
  message-less entry would reach the client as `{"path":"body.b"}`
  alongside siblings carrying both fields. Requiring the field makes the
  wire format uniform by construction.
- **Why an empty string:** It guarantees the shape without inventing
  wording that a consumer could mistake for a real Ajv message. It
  should never actually appear, since Ajv's `messages` option defaults
  to `true` and every configured validator populates the field, so the
  fallback is purely defensive.

### Validators return their validated value, they do not assert

- **Choice:** `validateMessage` returns `IncomingMessage` and
  `validateSchema` returns `T`, rather than carrying an
  `asserts x is T` signature.
- **Rationale:** Both forms are equally unchecked, since TypeScript never
  verifies an assertion body. The return form is better here for a
  concrete reason: an assertion permanently narrows the *caller's*
  variable, and `socket.ts` needs the un-narrowed value afterwards. Its
  `message` handler validates inside a `try`, and the `catch` builds an
  error reply out of the **raw** frame, which by definition failed
  validation. Returning a second, narrowed binding keeps both views
  available.
- **Secondary benefit:** a returned value has consumers the compiler
  checks, so the narrowing has to be right. An assertion whose narrowing
  nobody uses is inert.
- **Where the unchecked step lives:** exactly one `as` per validator,
  immediately after the Ajv call that justifies it. `validateSchema`
  needs its own for a second reason: it validates a *payload* (a copy
  with `headers` flattened to a plain object, because Ajv cannot
  enumerate a `Headers` instance) but returns the *original* request,
  whose `headers` is still a `Headers`. The two differ by design, so the
  validator's type parameter cannot flow through automatically.
- **Tying schema to type:** `ajv.compile<CreateSocketRequest>({...})`
  puts the shape next to the schema that enforces it, and
  `validateSchema` infers `T` from the validator instead of taking it at
  the call site.

### `SocketConnection` is structural, not Bun's `ServerWebSocket`

Scope note: this covers the handler *parameters*. The object those
handlers are returned in is typed the other way, deriving from Bun. See
[the next section](#buildsocketserver-returns-buns-websockethandler-directly).

- **Choice:** `socket.ts` declares its own three-member type
  (`data`, `send`, `close`) instead of importing `ServerWebSocket` from
  `bun`.
- **Rationale:** The module uses three members out of a large interface.
  Naming only those keeps `buildSocketServer` testable with a plain
  object literal, which is how `socket.test.js` already drives it.
- **Verified, not assumed:** `ServerWebSocket<SocketData>` is assignable
  to `SocketConnection` (`send` returning `number` satisfies a `unknown`
  return), and the object `buildSocketServer` returns is assignable to
  `WebSocketHandler<SocketData>`, which is what `Bun.serve` needs. Both
  were confirmed against `bun-types@1.3.14` before committing to the
  shape.
- **Caveat:** Bun declares `message(ws, message: string | Buffer)` with
  method shorthand, so its parameters are bivariant and a narrower
  `raw: string` would have compiled while still being wrong. `socket.ts`
  types `raw` as `string | Buffer` to match reality, and `String(raw)`
  makes explicit the coercion `JSON.parse` was already doing implicitly.

### `buildSocketServer` returns Bun's `WebSocketHandler` directly

- **Choice:** the hand-written `SocketServer` type is deleted, and
  `buildSocketServer` returns `WebSocketHandler<SocketData>`.
- **Why derive at all.** `SocketServer` restated Bun's three signatures
  independently, so a change in `bun-types` would surface as a runtime
  failure inside `Bun.serve` rather than a compile error. The public
  contract is now Bun's own, so drift is a build break.
- **The optionality is not uniform.** Confirmed in
  `bun-types@1.3.14/serve.d.ts`, since this is the whole basis of the
  cost below:

  ```ts
  message(ws, message): void | Promise<void>       // required
  open?(ws): void | Promise<void>                  // optional
  close?(ws, code, reason): void | Promise<void>   // optional
  ```

  A handler object may supply any subset, so only `message` is
  guaranteed.
- **Cost, measured rather than estimated: 32 `TS2722`** ("Cannot invoke
  an object which is possibly 'undefined'"), all in `socket.test.ts`,
  and the arithmetic confirms the cause exactly: 22 `server.open` calls
  plus 10 `server.close` calls. The 11 `server.message` calls produce
  none, because that member is required.
- **The tests narrow once instead of asserting 32 times.**
  `socket.test.ts` declares a local
  `TestServer = Required<Pick<WebSocketHandler<SocketData>, 'open' |
  'close' | 'message'>>` and a `buildTestServer` wrapper that casts. The
  guarantee is real (the function always returns all three), so it is
  stated in one place rather than as 32 `!` operators. Same principle as
  `LooseHandler` and `SocketMock` in the same file. The wrapper takes
  `...args: Parameters<typeof buildSocketServer>`, so it needs no
  imports of its own and cannot drift from the real signature.
- **A separate cost, orthogonal to the type choice.** Bun declares
  `close(ws, code, reason)` with three *required* parameters, so 10 test
  call sites gained a `''` reason. Verified orthogonal: dropping the
  argument fails with `TS2554` regardless of which return type is used.
  That is the tests becoming faithful to what Bun actually calls.
- **The implementation still declares two parameters**
  (`close (ws, code)`). A function accepting fewer parameters is
  assignable to one accepting more, so this compiles, and it is not a
  hole: the handler genuinely ignores `reason`.
- **The `as WebSocketHandler<SocketData>` on the returned literal is
  redundant.** Verified by removing it: the object is already assignable,
  and both drift probes still fail without it (a wrong `open` parameter
  type gives `TS2352` plus `TS2339`; a deleted `message` member gives
  `TS2352`, since `message` is required). It is retained as written
  rather than removed, but it is not what provides the checking.
- **Naming wart to be aware of:** `buildSocketHandlers()` returns
  `SocketEndpoint[]`, the HTTP handshake terminals, not WebSocket
  handlers. `buildSocketServer()` is what returns the handler object.

### Test doubles for wide interfaces: one cast at the factory

- **Problem:** once the handlers are typed through
  `ServerWebSocket<SocketData>` (20 members), the four-property object
  literal returned by `socket.test.ts`'s `buildSocket` no longer
  satisfies them, across 75 call sites.
- **Choice:** a single `as unknown as SocketMock` inside the factory,
  where `SocketMock` intersects `ServerWebSocket<SocketData>` with the
  test-only surface: `send` and `close` re-narrowed to mocks, plus a
  `welcome` accessor.
- **Rationale:** the same trade-off as `LooseHandler`
  [above](#the-request-hierarchy-and-why-middleware-is-not-generic).
  Stubbing 16 unused members would be inert code proving nothing, while
  the assertions that matter (`toHaveBeenCalledWith` on `send` and
  `close`) stay fully typed because the intersection re-narrows exactly
  those two.
- **Type a field by what it holds, not by what it is named.** `welcome`
  was first annotated `WelcomeMessage`, which took the file from 1 error
  to 9: despite the name it holds *the first frame the handler sent*,
  and most suites use it to read a `response` frame. It stays
  `Record<string, unknown>`, with a local `welcomeToken()` helper at the
  one site that reads `body.token`. Typing it precisely would require
  renaming it first.

### `SocketData` is required-and-nullable, not optional

- **Choice:** `superseded: boolean`, `reaped: boolean`, and
  `reaperHandle: ReturnType<typeof setTimeout> | null`, rather than
  the `?` optional form all three started with.
- **The type change alone would have been a lie.** These fields were
  never initialized. They came into existence only when `armReaper` ran
  or a socket was superseded or reaped, so a socket that had just opened
  genuinely lacked them. Dropping `?` without touching the runtime would
  have declared `boolean` for a value that was `undefined`. The
  `if (ws.data.superseded)` checks would still work, since `undefined` is
  falsy, which is exactly what makes the lie survivable and therefore
  worth avoiding.
- **So the substantive change is the initialization**, not the
  annotation. The `GET /ws` terminal now seeds all three on `ctx.data`
  before calling `server.upgrade`, which is the single place `ws.data` is
  constructed.
- **Why `reaperHandle` is `| null` rather than optional.** There is no
  meaningful initial timer. Required-and-nullable says the key is always
  present but may hold nothing, which is the true shape; optional would
  say the key may be missing, which is no longer true. `null` over
  `undefined` matches the house convention for deliberate absence
  (`NextFn | null`, `ErrorOutput`, and the client's
  `#livenessTimer` / `#heartbeatTimer` / `#reconnectTimer`).
- **The guard is what makes `null` viable.** Both `clearTimeout`
  overloads accept `string | number | Timeout | undefined` and reject
  `null` (`TS2769`), even though `clearTimeout(null)` is a runtime no-op
  exactly like `clearTimeout(undefined)`. Without a guard, `null` would
  cost a `?? undefined` at each call site, which is pure compiler
  appeasement. Wrapping the call instead states the intent directly and
  narrows the type as a side effect:

  ```ts
  if (ws.data.reaperHandle) {
    clearTimeout(ws.data.reaperHandle)
  }
  ```

  Expect the same `TS2769` when the client converts, where three timer
  fields are already initialized to `null`. The same guard resolves it.
- **The compiler cannot verify any of this.** `ws.data` is produced by
  `UpgradeData` and consumed as `SocketData`, with Bun's `upgrade` in
  between, so the two types are never structurally compared. Correctness
  rests on the initialization, not on the declaration.
- **This was expected to become checkable once the handlers derived from
  `WebSocketHandler<T>`. It did not.** Verified after that change landed:
  adding a required field to `SocketData` still produces **zero** errors.
  Two independent reasons, either sufficient on its own. `UpgradeData`
  declares `clientId?: string` alongside a `[key: string]: unknown` index
  signature, so it accepts any shape; and the upgrade call goes through
  `CreateSocketRequest`, whose `server.upgrade` is a hand-rolled
  structural type rather than Bun's `Server<SocketData>`, so `SocketData`
  never enters the comparison. Typing the *handlers* constrains what
  comes out of `Bun.serve`, not what goes into `upgrade`.
- **Closing it would mean typing the upgrade site**, replacing the local
  `UpgradeContext` and `CreateSocketRequest.server` with Bun's `Server`.
  Untaken so far, and tracked nowhere else, so it is recorded here.
- **Cost:** 8 assertions in `socket.test.js` pin the upgrade context
  exactly, and all 8 had to gain the three fields. `toHaveBeenCalledWith`
  does distinguish a present-but-`undefined` key from an absent one, so
  `reaperHandle: null` had to be spelled out in each.

### Reading a static member off a caught error

- **Choice:** `err.constructor as typeof RequestError` inside an
  `err instanceof RequestError` guard.
- **Rationale:** Status lives on the *class*, not the instance, and
  `Error.prototype.constructor` is typed `Function`, which has no
  `status`. The `instanceof` guard establishes the fact at runtime; the
  cast is only how the static side is reached. Replacing
  `err.constructor.status ?? InternalServerError.status` with the guard
  also removes a `??` that could never fire, since every `RequestError`
  subclass declares `status` and everything else fails the guard.

### A missing message is a gap at the throw site, not an optional param

- **Choice:** `message` is required on all 34 single-message error
  classes. No class takes a defaulted `message = ''`. Four classes
  (`NotFoundError`, `MethodNotAllowedError`, `NotImplementedError`,
  `GatewayTimeoutError`) take no message parameter at all, which is a
  deliberate statement that those responses carry no body.
- **How this got settled.** Converting `socket.ts` surfaced two bare
  throw sites that no longer compiled once `message` was required:
  `ServiceUnavailableError()` on the ticket-pool cap and
  `UnauthorizedError()` on a reclaim token mismatch. Both briefly took
  `message: string = ''` because that was the mechanical fix. Both then
  had it removed, because the real defect was the throw site: neither
  error had ever explained itself. They now throw
  `'Unable to issue ticket'` and `'Invalid token'`.
- **The general rule:** default a parameter only where both forms are
  genuinely meaningful. Defaulting to satisfy the compiler preserves the
  omission instead of fixing it, and it converts a loud failure into a
  silent empty response body.
- **Consequence to expect:** giving a previously-bare error a message
  changes the wire format, since `output` returns `{ message }` when a
  message is set and `null` otherwise. Both changes flipped their status
  responses from an empty body to JSON, which broke integration
  assertions that had pinned `res.body` to `null`. That is the change
  being visible, not a regression.

### Non-null assertions in `SleepySocketClient`, and how they were vetted

- **Situation:** the client is a connection state machine. Fields like
  `#id`, `#socket`, and `#reconnectConfig` are genuinely null before a
  connection exists and genuinely non-null once one does, but the
  invariant lives in `#ready` and in call ordering, which the compiler
  cannot follow.
- **Choice:** seven `!` assertions, each at a site where a runtime guard
  would be unreachable. Adding `if (!this.#socket) return` would violate
  [the rule against unreachable defensive
  fallbacks](#do-not-add-unreachable-defensive-fallbacks) and would
  silently change behaviour if the invariant ever broke, instead of
  throwing.
- **Each one was tested for necessity, not assumed.** Removing the
  assertion and re-running `tsc` proved seven genuinely required and one
  merely decorative: `const [entry] = arr.splice(0, 1)` already yields a
  non-optional element, so `entry!` there was noise and was deleted.
  `arr.pop()` and `arr.at(-1)` really do return `T | undefined`, so the
  LIFO path keeps its assertion. An unnecessary `!` is worse than none,
  because it implies a nullability that does not exist.
- **The invariants, for the record:** `#startHeartbeat` runs only from
  `onWelcome`, after `#id` is assigned; `#stopHeartbeat` runs in
  `#handleClose` *before* `#socket = null`, so the interval can never
  observe a null socket. `#sendRequest` is guarded by `#ready`.
  `entry.response` is only read under `if (entry.ready)`, and `ready`
  is set in the same statement pair as `response`.

### Prefer making an invariant structural over asserting it

- **Choice:** `#scheduleReconnect(attempt, config)` takes the reconnect
  config as a parameter instead of reading `this.#reconnectConfig!`.
- **Rationale:** the only caller already stands inside
  `if (!this.#reconnectConfig) { … return }`, so TypeScript has *already
  narrowed the field* at that point. Passing the narrowed value forwards
  hands the compiler a proof rather than an assertion, and the recursive
  call threads the same value. This is the preferred shape whenever a
  caller has already done the check: an assertion is the fallback for
  when it has not.

### Aliased conditions do not narrow a property access

- **Problem:** `connect` had
  `const hasReconnect = opts.reconnect && typeof opts.reconnect === 'object'`
  followed by `hasReconnect ? opts.reconnect : {}`. Under TS 5.9 the
  ternary does **not** see through the alias, and `opts.reconnect` stays
  `ReconnectOptions | false | undefined`.
- **Verified, not guessed.** Three forms were compiled side by side: the
  aliased `&&` chain fails, a simpler aliased `typeof` check also fails,
  and only inlining the condition into the ternary narrows.
- **Choice:** inline the condition and drop the single-use variable. The
  alternative was a cast, which would assert exactly what inlining lets
  the compiler prove.

### A bare `mock()` types as `any`, so pass it a type argument

- **Problem:** `bun:test` declares
  `mock: <T extends (...args: any[]) => any>(Function?: T) => Mock<T>`.
  The parameter is optional, so a bare `mock()` has nothing to infer `T`
  from and it falls back to the *constraint*,
  `(...args: any[]) => any`. Every downstream assertion on that mock is
  then unchecked.
- **How this surfaced:** converting `utils.test.ts`, the file typechecked
  clean on a pure rename with no annotations at all. That is the signal
  worth distrusting. Probing the inferred types showed
  `setIdGenerator(fn)` accepted a mock whose `mockReturnValueOnce` had
  been handed the number `12345`, even though `setIdGenerator` requires
  `() => string`.
- **Choice:** `mock<IdGenerator>()`, naming the contract the mock stands
  in for.
- **Rationale:** The point of a test double is to satisfy the same
  contract as the real thing. Leaving `T` to the constraint means the
  double is checked against nothing, which is exactly the coverage a
  typed test is supposed to add. The `any` originates in bun-types, not
  in our source, so `no-explicit-any` cannot catch it; only an explicit
  type argument closes it.
- **The general rule:** when a converted test passes with no annotations,
  confirm the checks are real before believing them. Feed a deliberately
  wrong value to each assertion that looks type-guarded, and check it
  actually fails to compile.
- **Not every loose-looking spot needs this.** `spyOn(crypto,
  'randomUUID')` infers from the real object, so it is already precise:
  it returns
  `Mock<() => \`${string}-${string}-${string}-${string}-${string}\`>`,
  and a non-UUID literal fails to compile. Only the argument-less
  `mock()` degrades.

## References

- [Linting](./linting.md) for the shared style rules, which the
  `**/*.ts` ESLint block reuses verbatim.
- [Request Flow](../architecture/request-flow.md) for the `res`
  threading model these middleware types describe.
