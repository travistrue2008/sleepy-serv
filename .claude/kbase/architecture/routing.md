# Routing

Directories are resources, method-named files are handlers. `api/users/:userId/get.js` → `GET /users/:userId`. Colon-prefixed dirs are dynamic params. Supported methods: GET, HEAD, PATCH, POST, PUT, DELETE.

`QUERY` is deliberately excluded from that list: `Bun.serve({ routes })`'s method-keyed dispatch table only recognizes the standard `HTTPMethod` set and silently 404s a `QUERY` key even with a handler present (confirmed empirically against Bun 1.3.13). The `sleepy-socket` client and the WebSocket request schema do accept `QUERY` — see [Real-time / WebSocket Layer § Client request API](./websocket.md#client-request-api) — but a `query.js` route file only ever gets reached over that transport, never over REST.

## 404 vs 405

404 and 405 live in **two places**: every known path is pre-seeded with all six verbs pointing at a 405 handler (`buildServerRoutes`), while the server-level `fetch` fallback throws `NotFoundError` for unknown paths (`buildServer`).

See also: [Overview](./overview.md), [Request Flow](./request-flow.md), [Errors](./errors.md).
