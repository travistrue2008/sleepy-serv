# Errors

Errors map to HTTP status via a **`static status`** on the error class, read off `err.constructor` in the `Bun.serve` `error` hook. `packages/server/src/errors.js` defines a `RequestError` base plus one subclass per 4xx/5xx code.

See also: [Middleware](./middleware.md), [Routing](./routing.md).
