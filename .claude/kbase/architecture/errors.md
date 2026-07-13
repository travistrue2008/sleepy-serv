# Errors

Errors map to HTTP status via a **`static status`** on the error class, read off `err.constructor` in the `Bun.serve` `error` hook. `packages/server/src/errors.js` defines a `RequestError` base plus one subclass per 4xx/5xx code.

## Serialization: the `output` getter

Each `RequestError` also exposes an **`output`** getter that decides the response body and content-type. The base returns `{ message }` when a message is set and `null` otherwise; `UnprocessableContentError` overrides it to return the parsed validation-error array. Both error paths branch on whether `output` is defined:

- **HTTP** (`index.js` `error` hook): `output !== undefined` returns `Response.json(output, { status })`, so Bun attaches `content-type: application/json;charset=utf-8`; otherwise `new Response(err.message, { status })` with no content-type.
- **WebSocket** (`socket.js` `message` catch): the same branch builds the `response` frame body from `output` and attaches `content-type: application/json;charset=utf-8` when `output` is defined; otherwise it sends the raw `message` string with no content-type header.

A plain, non-`RequestError` throw has no `output`, so it maps to a 500 with the bare message and no content-type on both paths. `NotFoundError`/`MethodNotAllowedError` carry an empty message, so their `output` is `null`, yielding a JSON `null` body with the content-type header.

See also: [Middleware](./middleware.md), [Routing](./routing.md), [Real-time / WebSocket Layer](./websocket.md).
