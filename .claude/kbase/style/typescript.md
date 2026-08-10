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

## Typing decisions

### `executeMiddlewareChain` is generic over the request

- **Choice:** `executeMiddlewareChain<TReq>(req: TReq, chain:
  Middleware<TReq>[])` rather than naming a concrete request type.
- **Rationale:** `req` is not a `Request`. The two callers build
  *different* envelopes: `buildBunRequest` (`index.js`) produces
  `{method, route, headers, params, query, raw, server, json}`, while
  `buildRequest` (`socket.js`) produces
  `{id, clientId, method, route, headers, params, query, json}`.
  `utils` only forwards the value and never inspects it, so a generic
  states that honestly and lets each caller supply its own shape.
- **Revisit:** After `socket.ts` and `index.ts` convert. The common core
  is `method`, `route`, `headers`, `params`, `query`, `json`, which can
  become a named base type with `TReq` constrained to it. Tracked in
  [`.claude/FEATURE.md`](../../FEATURE.md).

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
  (`middleware.js`, `messages.js`, and `socket.js` twice), so the input
  really is an Ajv error. `Partial<>` is what allows the unit tests to
  pass minimal `{instancePath, message}` literals, since a bare
  `ErrorObject` also requires `keyword`, `schemaPath`, and `params`.
- **Why not an index signature:** `{instancePath?, message?, [key:
  string]: unknown}` also compiles, but it silently accepts a
  misspelled `instancPath`. `Partial<ErrorObject>` rejects it with a
  "did you mean" suggestion.
- **Note:** `import type` is fully erased, so nothing is added to the
  runtime module graph.

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

## References

- [Linting](./linting.md) for the shared style rules, which the
  `**/*.ts` ESLint block reuses verbatim.
- [Request Flow](../architecture/request-flow.md) for the `res`
  threading model these middleware types describe.
