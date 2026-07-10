# Middleware

**Order:** app-level (`createApp` opts) → directory-level (`meta.js` `export const middleware`, root→leaf) → route-level (the handler array). Directory middleware applies by **path-prefix matching**, sorted shortest-first.

**Built-in** (`packages/server/src/middleware.js`): `parseJson`; `validateSchema(schemas)` (AJV); `setValidationFormats(formats)`.

## Gotcha: two unrelated `meta.js`

`packages/server/src/meta.js` is a generic tree/object utility module — **unrelated** to route `meta.js` files (the ones that `export const middleware`). Don't conflate them.

See also: [Request Flow](./request-flow.md), [Errors](./errors.md).
