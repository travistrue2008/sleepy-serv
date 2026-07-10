# Docs Index

Knowledge base for `sleepy-serv` (server) and `sleepy-socket` (client). See [CLAUDE.md](./CLAUDE.md) for how this base is maintained.

## Architecture

- [Overview](./architecture/overview.md) — what `sleepy-serv` is; engine location and public API.
- [Layout](./architecture/layout.md) — Bun workspace and repo structure.
- [Routing](./architecture/routing.md) — directory-to-route convention, 404 vs 405, the `/api` whitelist gotcha.
- [Request Flow](./architecture/request-flow.md) — route build pipeline; the `res` accumulator model.
- [Middleware](./architecture/middleware.md) — resolution order, built-ins, the two-`meta.js` gotcha.
- [Errors](./architecture/errors.md) — how errors map to HTTP status.
- [Real-time / WebSocket Layer](./architecture/websocket.md) — `/ws` upgrade, message model, welcome handshake, heartbeat/presence.
- [Testing](./architecture/testing.md) — test styles (unit / integration / E2E).

## Guides

- [Testing Patterns](./guides/testing-patterns.md) — fake timers and mocking over real infra.

## Style

- [Linting](./style/linting.md) — `eslint.config.mjs` rationale and per-rule decisions.

## Roadmap

- [Roadmap](./ROADMAP.md) — feature checklist and test-case catalog.
