# Request Flow

`getAllFilePathsRec` recursively scans `<rootPath>/api` → `buildRoutesPaths` maps each method file to `{ method, path, metaMiddlewarePath, modulePath }` → `buildHandlers` dynamically `import()`s each module and assembles the middleware chain → `buildServerRoutes` builds the route table for `Bun.serve`; `buildServer` starts it.

## `res` is an accumulator, not a response

Handlers receive `(req, res, next)`; `res` is a plain `{}` that middleware write to in order to pass data down the chain. The actual HTTP response is the `Response` object a handler **returns** — returning a non-`Response` throws `TypeError`.

See also: [Overview](./overview.md), [Routing](./routing.md), [Middleware](./middleware.md).
