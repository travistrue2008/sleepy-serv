# Overview

`sleepy-serv` is a **filesystem-driven REST server**: the directory layout under `src/api` defines the routes. The engine lives in `packages/server/src/core/`; the public API is `createApp(port, opts?)` with routes resolved automatically by the [plugin](./plugin.md). Re-exported error classes and middleware utilities are available from the main `sleepy-serv` entry point.

These behaviors differ from Express and aren't obvious from a single file, so see the focused notes:

- [Layout](./layout.md): where the packages live.
- [Routing](./routing.md): how directories map to routes.
- [Request Flow](./request-flow.md): how routes are built and served.
- [Middleware](./middleware.md): resolution order and built-ins.
- [Plugin](./plugin.md): how routes are discovered and loaded.
- [CLI](./cli.md): the `sleepy` executable (`init`, `dev`, `build`).
- [Errors](./errors.md): how errors become HTTP statuses.
- [Real-time / WebSocket Layer](./websocket.md): the `/ws` protocol.
