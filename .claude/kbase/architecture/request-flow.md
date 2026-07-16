# Request Flow

`getAllFilePathsRec` recursively scans `<rootPath>/api` → `buildRoutePaths` maps each method file to `{ method, path, metaMiddlewarePath, modulePath }` → `buildChain` dynamically `import()`s each module and assembles its middleware chain → `buildMergedRoutes` folds the reserved `/ws` handshake terminals into those chains → `buildModuleRoutes` wraps each chain in a `Bun.serve` handler → `buildServerRoutes` builds the route table; `buildServer` starts it.

## `res` is a threaded value, not a response

Handlers receive `(req, res, next)`. `res` is the value handed to the current middleware; `executeMiddlewareChain` starts it as a plain `{}` for the first middleware. Middleware do not mutate a shared object. Instead they pass data forward through `next(data)`: whatever is passed becomes the next middleware's `res`, so a middleware can transform (e.g. `parseJson` forwards the parsed body via `next(body)`) or extend it. Calling `next()` with no argument yields `undefined`, so forward the current value unchanged with `next(res)`. The actual HTTP response is the `Response` object a handler **returns**; returning a non-`Response` throws `TypeError`. The reserved `/ws` handshake terminals additionally read the value the terminal receives and hand it to the client as the handshake `data` field (cached as `client.connectionData`), so on those routes `res` is both the inbound threaded value and the outbound app-data channel (see [WebSocket Layer](./websocket.md)).

See also: [Overview](./overview.md), [Routing](./routing.md), [Middleware](./middleware.md).
