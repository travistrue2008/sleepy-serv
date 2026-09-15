# Core Modules

The engine lives in `packages/server/src/core/` and is organized into four source files. The dependency graph is a DAG with no circular imports.

## Module Roles

- **`utils.ts`** -- leaf module with zero local imports. Contains shared types (HTTP, status codes, request shapes, handler signatures, middleware chain), session/socket data types consumed by `socket.ts`, and three utility functions (`toSegments`, `formatError`, `executeMiddlewareChain`).
- **`socket.ts`** -- WebSocket engine. Imports types and utilities from `utils.ts`. Owns connection lifecycle types (`SocketConnection`, `ActiveSession`, `InactiveSession`, `Session`), protocol constants (`InternalCloseSignal`/`ServerCloseSignals`), configuration (`SocketOptions`), and all socket runtime functions (`buildSocketState`, `buildSocketServer`, `buildSocketCommands`, etc.).
- **`errors.ts`** -- request error class hierarchy. Imports `StatusCode` from `utils.ts`. Each error class carries a static `status` getter.
- **`index.ts`** -- barrel/interface module. Imports from all three siblings and re-exports the public API. Also defines types that depend on both `utils.ts` and `socket.ts` (`AppOptions`, `RouteDefinition`, `MetaEntry`, `RouteConfig`, `App`) and contains the `createApp` implementation.

## Dependency Direction

```
utils.ts  <--  socket.ts
utils.ts  <--  errors.ts
utils.ts  <--  index.ts
socket.ts <--  index.ts
errors.ts <--  index.ts
```

`utils.ts` imports nothing from local modules, only from `ajv` and `bun`. This is intentional: types that both `utils.ts` and `socket.ts` need (like `SocketData`, `SocketCommands`, `CloseSignal`) live in `utils.ts` so the dependency flows one way.

## Type Placement Rules

A type belongs in **`utils.ts`** if any of:
- It has no socket-specific semantics (HTTP method, status code, request shape, middleware signature, validation).
- It is needed by `socket.ts` AND another local module (like `errors.ts` or `index.ts`).
- Moving it to `socket.ts` would force `utils.ts` to import from `socket.ts`, creating a cycle.

A type belongs in **`socket.ts`** if:
- It is only imported by `socket.ts` (and optionally re-exported via `index.ts`).
- It only references types from `utils.ts` (no other local files).
- Examples: `SocketConnection`, `ActiveSession`, `InactiveSession`, `SocketOptions`, `InternalCloseSignal`, `Session`.

A type belongs in **`index.ts`** if:
- It depends on types from both `utils.ts` and `socket.ts` (e.g., `AppOptions` uses `Middleware` from utils and `SocketOptions` from socket).
- It is part of the app-level public API but not used internally by the engine (`RouteDefinition`, `RouteConfig`, `MetaEntry`, `App`).

## Circular Type Imports

Type-only circular imports (`import type`) are technically safe in TypeScript (they are erased at compile time and do not affect module initialization order). However, this project avoids them by keeping `utils.ts` as a pure leaf. When a type needs to exist in `utils.ts` but references a socket concept, the referenced type is also placed in `utils.ts`. This is a structural cleanliness choice, not a correctness requirement.

See also: [Layout](./layout.md), [Request Flow](./request-flow.md), [WebSocket Layer](./websocket.md).
