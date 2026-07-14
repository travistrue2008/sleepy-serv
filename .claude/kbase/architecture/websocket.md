# Real-time / WebSocket Layer

Server code lives in `packages/server/src/socket.js` + `messages.js`; the client is `packages/client` (`sleepy-socket`).

The handshake spans two reserved routes. `buildSocketHandlers` (in `socket.js`) returns an `endpoints` object (`GET`/`POST`/`PUT`) that `index.js` wires straight into Bun's `routes`: `GET` and `POST` under `/ws`, and `PUT` under `/ws/:clientId`. The split is by intent, *create a new identity* vs. *reference an existing one*, not idempotency. `POST /ws` takes **no body** and always mints a fresh `clientId`, returning a short-lived, single-use `ticket` as `{ clientId, ticket }`. `PUT /ws/:clientId` reclaims an existing identity: it reads `clientId` from the path and the secret `token` from an `Authorization: Bearer` header, returns **404** (`NotFoundError`) when no live-or-unexpired session exists for that `clientId`, **401** (`UnauthorizedError`) when the token does not match, and `{ clientId, ticket }` on a match. The upgrade `GET /ws?ticket=` redeems the ticket (single-use) and sets the resolved `clientId` in `ws.data`. Because the intent lives in the verb and URL, neither endpoint parses a request body; `bindTicket` and `redeemTicket` are closure-private helpers reached only through the endpoints. The client then sends **request** frames that are file-routed on `route`+`method` through the *same* middleware chains as HTTP (`buildSocketRoutes`, `buildSocketHandlers`), and the server replies with a **response** frame. Message shapes live in `messages.js`: `TYPES` = welcome/heartbeat/request/response, `TYPES_RECEIVED` = the request+heartbeat subset the server accepts, plus `createMessage` and the exported `validateMessage` (which dispatches on `type` to a per-type AJV validator; the `request` validator requires `id` **and** `clientId` as uuids, while the `heartbeat` validator only requires `type`).

The **response** envelope is now a real `createMessage(clientId, TYPES.RESPONSE, …)` frame — both success replies (built from the handler's `Response` via `buildOutgoingMessage`) and error replies (status from the error's `constructor.status`) go through it; an error whose `output` is defined serializes its JSON `output` as the body with a `content-type: application/json;charset=utf-8` header, otherwise the raw `message` string with no content-type (see [Errors](./errors.md)). Only the spec's `notification`/`acknowledge` envelopes, and the server-initiated push half they enable, remain unbuilt (see [sleepy-socket Protocol](../ideas/sleepy-socket.md)).

## Client correlation

The client hand-rolls the pending-request registry (spec §3) as `#dispatchedMessages`: `send()` returns a promise and pushes `{ id, resolve, reject, timer }`; an incoming frame matches on `id` to drain, **unmatched replies are dropped** (never error-replied), and `close` rejects everything still in flight. A `queue` option — `none` / `fifo` / `lifo` — selects the drain strategy when concurrent replies land out of order.

## Welcome handshake

`server.upgrade(req, { data })` is **server-side only**, so `ws.data` never reaches the client. On `open` the server sends a **welcome** frame carrying `clientId`, `token`, and `heartbeatInterval`; the client caches all three, and `connect()` resolves on that welcome (not the raw socket open), rejecting if the first frame isn't a welcome. `connect()`'s timeout now spans the whole `ticket-request -> upgrade -> welcome` sequence (the ticket request is `POST /ws` on a first connect, `PUT /ws/:clientId` on a reclaim); a failed ticket request counts as a failed attempt.

## Presence / heartbeat (both directions)

Presence is now symmetric. `createApp` accepts `opts.ws.{ heartbeatInterval = 30_000, disconnectThreshold = 120_000, reclaimTtl = 300_000, ticketTtl = 10_000 }` (ms).

Server side: the client emits a **heartbeat** every `heartbeatInterval`; the server arms a per-connection `setTimeout(disconnectThreshold)` reaper that **any** inbound message resets (self-cleaning via the `close` handler, no global sweep). The reaper flags `ws.data.reaped` before closing so `close` can tell an involuntary reap from a willing close.

Client side: the heartbeat is no longer a no-op. The server replies with a **heartbeat ack** (the same `HEARTBEAT` type, echoing the `id`; no distinct ack type). The client runs its own liveness reaper (`#serverTimeout`, default `120_000` ms, overridable via `opts.serverTimeout`), reset by **any** inbound frame. The threshold is fully client-driven and does not derive from the server's reported `heartbeatInterval`. This is what detects a silent half-open server that no `close`/`error` event would surface. When it fires, the client closes its own socket, which funnels into the single reconnect path.

Detection is asymmetric: each side falls back to its own reaper on independent clocks, so the two can fire in either order. That skew is why reclaim (below) is gated on the token, not on the server having already noticed the drop.

## Reconnect

An unexpected drop (any close the app did not initiate, decided by the `#closing` flag, not the close code) triggers auto-reconnect with exponential backoff plus jitter (`opts.reconnect = { minDelay, maxDelay, factor }`, or `reconnect: false` to restore throw-on-unclean-close). In-flight requests are rejected on drop; there is no built-in buffer/replay. Each attempt re-runs the full handshake: `PUT /ws/:clientId` to reclaim (falling back to `POST /ws` for a fresh identity on a 401/404), then ticket -> upgrade -> welcome.

"Connected" tracks the completed **welcome**, not the presence of a socket object. A `#ready` flag is set only when a welcome resolves and cleared on drop/close, so `isConnected` returns it (not `!!#socket`). This matters because `#openSocket` assigns `#socket` while it is still CONNECTING, so during the reconnect window `isConnected` is **false** and a `send()` rejects with the library's own `Error('Socket is closed')` rather than leaking a native `InvalidStateError` from the raw socket. Gating `send()` on `#ready` also guarantees the underlying socket is OPEN whenever a frame is actually written.

## Identity model (session + ticket)

`clientId` now survives reconnects, so it is the session identifier (a slice of spec §6). Two server-wide stores live in the `buildSocketHandlers` closure:

- `sessions`: `clientId -> { token, expiresAt }`. `expiresAt` is unset while a connection is live. On an **involuntary** close (reaper flag, or a non-1000 code) it is stamped `now + reclaimTtl`, opening a reclaim window. On a **willing** close (code 1000, not reaped) the session is deleted, so the identity is terminal. `open` mints a fresh `token` on every connection (rotating on reclaim) and delivers it in the `welcome` frame; a reclaiming connection supersedes any still-live socket for that `clientId`.
- `tickets`: `ticket -> { clientId, expiresAt }`, short-lived and single-use.

The secret `token` never travels in a URL: only in the `PUT /ws/:clientId` `Authorization: Bearer` header and the `welcome` frame. The upgrade URL carries only the throwaway `ticket`. `PUT /ws/:clientId` reclaims the `clientId` when the supplied `token` matches a live-or-unexpired session; a mismatch is a **401** and an unknown or expired session is a **404**. On either failure the client falls back to `POST /ws` (within the same connect attempt) to adopt a fresh identity, so a stale token silently demotes to a new `clientId` rather than erroring the reconnect. The token is a *claim*, not a server-guaranteed-unique value; a hardened deploy would later swap the opaque token for a signed one. Neither handshake endpoint has rate limiting yet.

The `clientId` is the public identifier: it is the `PUT` path parameter used to locate the session for reclaim, and it is echoed in `welcome`, but it is never consumed for request routing, correlation, or presence. Player/user IDs (the rest of spec §6) remain unbuilt (see [sleepy-socket Protocol](../ideas/sleepy-socket.md)).

See also: [Overview](./overview.md), [Routing](./routing.md), [Middleware](./middleware.md), [Request Flow](./request-flow.md), [Testing](./testing.md).
