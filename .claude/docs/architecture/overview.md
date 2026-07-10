# Overview

`sleepy-serv` is a **filesystem-driven REST server**: the directory layout under `<rootPath>/api` defines the routes. The engine is `packages/server/src/index.js`; the public API is `createApp(port, rootPath, opts)`, `middleware`, and re-exported error classes.

These behaviors differ from Express and aren't obvious from a single file — see the focused notes:

- [Layout](./layout.md) — where the packages live.
- [Routing](./routing.md) — how directories map to routes.
- [Request Flow](./request-flow.md) — how routes are built and served.
- [Middleware](./middleware.md) — resolution order and built-ins.
- [Errors](./errors.md) — how errors become HTTP statuses.
- [Real-time / WebSocket Layer](./websocket.md) — the `/ws` protocol.
