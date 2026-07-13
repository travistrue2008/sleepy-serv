# Routing

Directories are resources, method-named files are handlers. `api/users/:userId/get.js` → `GET /users/:userId`. Colon-prefixed dirs are dynamic params. Supported methods: GET, HEAD, PATCH, POST, PUT, DELETE.

## 404 vs 405

404 and 405 live in **two places**: every known path is pre-seeded with all six verbs pointing at a 405 handler (`buildServerRoutes`), while the server-level `fetch` fallback throws `NotFoundError` for unknown paths (`buildServer`).

See also: [Overview](./overview.md), [Request Flow](./request-flow.md), [Errors](./errors.md).
