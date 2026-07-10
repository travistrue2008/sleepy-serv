# Real-time / WebSocket Layer

Server code lives in `packages/server/src/socket.js` + `messages.js`; the client is `packages/client` (`sleepy-socket`).

The reserved route `/ws` upgrades to a WebSocket (`checkForSocket` in `index.js`), minting a per-connection `clientId` (uuid) into `ws.data`. The client sends **request** frames that are file-routed on `route`+`method` through the *same* middleware chains as HTTP (`buildSocketRoutes` → `createSocketHandler`), and the server replies with a **response** frame. Message shapes live in `messages.js`: `TYPES` = welcome/heartbeat/request/response, plus `createMessage` and `validateRequest` (requires `id` **and** `clientId` as uuids).

The **response** envelope is now a real `createMessage(clientId, TYPES.RESPONSE, …)` frame — both success replies (built from the handler's `Response` via `buildOutgoingMessage`) and error replies (status from the error's `constructor.status`) go through it. Only the spec's `notification`/`acknowledge` envelopes, and the server-initiated push half they enable, remain unbuilt.

## Client correlation

The client hand-rolls the pending-request registry (spec §3) as `#dispatchedMessages`: `send()` returns a promise and pushes `{ id, resolve, reject, timer }`; an incoming frame matches on `id` to drain, **unmatched replies are dropped** (never error-replied), and `close` rejects everything still in flight. A `queue` option — `none` / `fifo` / `lifo` — selects the drain strategy when concurrent replies land out of order.

## Welcome handshake

`server.upgrade(req, { data })` is **server-side only** — `ws.data` never reaches the client. So on `open` the server sends a **welcome** frame carrying `clientId` + `heartbeatInterval`; the client caches both, and `connect()` resolves on that welcome (not the raw socket open), rejecting if the first frame isn't a welcome.

## Presence / heartbeat

Presence is **client-driven, reaped server-side**. `createApp` accepts `opts.ws.{ heartbeatInterval = 30_000, disconnectThreshold = 120_000 }` (ms). The client emits a **heartbeat** every `heartbeatInterval`; the server arms a per-connection `setTimeout(disconnectThreshold)` reaper that **any** inbound message resets (self-cleaning via the `close` handler — no global sweep). Every request also carries the cached `clientId`.

## Identity model (current state)

Connection ID is the only identifier that exists so far. The message-body `clientId` is **informational**, not an enforced identity boundary: `validateRequest` checks its uuid *format* and the server echoes it back onto responses, but nothing consumes it — routing keys off `route`+`method`, reply correlation off `id`, and the presence reaper off `ws.data.clientId` (the server-side upgrade data), never the body. The server therefore accepts *any* well-formed uuid in that field. Stable session/player IDs (spec §6) remain unbuilt.

See also: [Overview](./overview.md), [Routing](./routing.md), [Middleware](./middleware.md), [Request Flow](./request-flow.md), [Testing](./testing.md).
