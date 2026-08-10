# Middleware

**Order:** app-level (`createApp` opts) → directory-level (`meta.js` `export const middleware`, root→leaf) → route-level (the handler array). Directory middleware applies by **path-prefix matching**, sorted shortest-first.

**Built-in** (`packages/server/src/middleware.js`): `parseJsonBody()`; `validateSchemas(schemas)` (AJV); `setValidationFormats(formats)`. All three are **top-level named exports** (`import { parseJsonBody, validateSchemas, setValidationFormats } from 'sleepy-serv'`) surfaced via `export * from './middleware'` in `index.js`; there is no longer a `middleware` namespace object. `parseJsonBody()` and `validateSchemas(schemas)` are **factories**: each returns the actual `(req, res, next)` middleware, so a chain entry is `parseJsonBody()` (called), not a bare reference.

`validateSchemas` validates **only the keys present in `schemas`** (`headers`/`params`/`query`/`body`), iterating `Object.entries(schemas)`. An omitted key is not validated at all; there is no implicit default `body` schema, so `validateSchemas({})` forwards `res` unchanged.

## Gotcha: the JSON-parse try/catch is deliberately narrow

The parse lives in the `parseBody(req)` helper, whose `try` wraps **only** `await req.json()`; `parseJsonBody()`'s returned middleware calls it and then `return next(body)` *outside* any catch. This is intentional, not stylistic. `parseBody`'s `catch` unconditionally rewrites whatever it catches into `BadRequestError('Invalid JSON')`, so it must see only the parse. Folding the `return next(...)` into the same `try` would let a **synchronous** throw from a downstream middleware or handler be caught and mislabeled as a 400 invalid-body, masking the real error and status. It would not even be consistent: since the middleware `return`s the `next(...)` promise rather than awaiting it, a downstream *rejection* still escapes uncaught. So widening the `try` adds one mislabeling bug and no uniform coverage. Keeping the parse isolated in its own helper is what buys the honest `catch`.

## Same chain, both transports

The chain is transport-agnostic: an HTTP request and a WebSocket **request** frame for the same `route` + `method` dispatch through the *same* chain, so one guard (e.g. a Bearer-token check) covers both with no transport-specific code. Middleware pass data forward through `next(data)`: whatever is passed becomes the next middleware's `res` (calling `next()` with no argument yields `undefined`, so forward with `next(res)`). No shared mutable object; the first middleware starts from `null`. On the reserved `/ws` handshake routes the value the terminal receives is returned to the client as the handshake `data` field (cached as `client.connectionData`), which is how a handshake guard hands the client auth credentials or connection context. A worked JWT example lives at `tests/src/auth/jwt`. See [WebSocket Layer](./websocket.md) and [Request Flow](./request-flow.md).

## Gotcha: catch-all validators vs. the reserved `/ws` routes

App-level middleware (`opts.middleware`) also runs against the built-in `/ws` handshake routes, because they merge into the same chains. A catch-all validator placed there (e.g. a `validateSchemas` requiring a JSON body) will reject the body-less handshake requests. Scope such validators below the reserved paths instead. See [WebSocket Layer](./websocket.md#gotcha-built-in-ws-handlers-make-catch-all-validators-hard).

## Gotcha: `Headers` must be converted before Ajv validation

A `Headers` instance has **zero enumerable own properties**, so Ajv walks nothing and any header schema passes trivially. `JSON.stringify` is misleading here: Bun's `Headers` implements `toJSON`, so serialization looks correct while validation silently no-ops. `Object.keys(headers)` returns `[]` regardless.

Both validation paths therefore convert first. `validateSchema` in `socket.js` does `Object.fromEntries(obj.headers)`, and `validateSchemas` in `middleware.ts` does the same via an `instanceof Headers` check. The HTTP path was missing this for a long time, which meant the documented `headers` schema option never validated anything.

The second half of the trap is casing. `Headers` lowercases names per the HTTP spec, so `new Headers({ userId })` stores `userid` and a schema keyed `userId` matches nothing, silently passing again. `validateSchemas` normalizes header schema keys to lowercase for this reason; `params` and `query` are genuinely case-sensitive and are left alone. Validation errors report the lowercased name (`headers.userid`). The socket schemas happen to key on `authorization`, already lowercase, so they were never bitten.

See also: [Request Flow](./request-flow.md), [Errors](./errors.md).
