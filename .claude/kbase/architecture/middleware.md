# Middleware

**Order:** app-level (`createApp` opts) → directory-level (`meta.js` `export const middleware`, root→leaf) → route-level (the handler array). Directory middleware applies by **path-prefix matching**, sorted shortest-first.

**Built-in** (`packages/server/src/middleware.js`): `parseJson`; `validateSchema(schemas)` (AJV); `setValidationFormats(formats)`.

## Same chain, both transports

The chain is transport-agnostic: an HTTP request and a WebSocket **request** frame for the same `route` + `method` dispatch through the *same* chain, so one guard (e.g. a Bearer-token check) covers both with no transport-specific code. Middleware pass data forward by writing to `res`; on the reserved `/ws` handshake routes that same `res` is returned to the client as the handshake `data` field (cached as `client.connectionData`), which is how a handshake guard hands the client auth credentials or connection context. A worked JWT example lives at `tests/src/auth/jwt`. See [WebSocket Layer](./websocket.md) and [Request Flow](./request-flow.md).

## Gotcha: two unrelated `meta.js`

`packages/server/src/meta.js` is a generic tree/object utility module — **unrelated** to route `meta.js` files (the ones that `export const middleware`). Don't conflate them.

See also: [Request Flow](./request-flow.md), [Errors](./errors.md).
