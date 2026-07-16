# Request Flow

`getAllFilePathsRec` recursively scans `<rootPath>/api` → `buildRoutePaths` maps each method file to `{ method, path, metaMiddlewarePath, modulePath }` → `buildChain` dynamically `import()`s each module and assembles its middleware chain → `buildMergedRoutes` folds the reserved `/ws` handshake terminals into those chains → `buildModuleRoutes` wraps each chain in a `Bun.serve` handler → `buildServerRoutes` builds the route table; `buildServer` starts it.

## `res` is an accumulator, not a response

Handlers receive `(req, res, next)`. `res` is a plain `{}` that `executeMiddlewareChain` creates fresh per request; middleware write to it to pass data down the chain. The actual HTTP response is the `Response` object a handler **returns**; returning a non-`Response` throws `TypeError`. The reserved `/ws` handshake terminals additionally read this `res` back out and hand it to the client as the handshake `data` field (cached as `client.connectionData`), so on those routes `res` is both the inbound accumulator and the outbound app-data channel (see [WebSocket Layer](./websocket.md)).

See also: [Overview](./overview.md), [Routing](./routing.md), [Middleware](./middleware.md).
