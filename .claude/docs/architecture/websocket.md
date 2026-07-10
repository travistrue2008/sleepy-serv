# Real-time / WebSocket Layer

Server code lives in `packages/server/src/socket.js` + `messages.js`; the client is `packages/client` (`sleepy-socket`).

The reserved route `/ws` upgrades to a WebSocket (`checkForSocket` in `index.js`), minting a per-connection `clientId` (uuid) into `ws.data`. The client sends **request** frames that are file-routed on `route`+`method` through the *same* middleware chains as HTTP (`buildSocketRoutes` → `createSocketHandler`), and the server replies with a **response** frame. Message shapes live in `messages.js`: `TYPES` = welcome/heartbeat/request/response, plus `createMessage` and `validateRequest` (requires `id` **and** `clientId` as uuids). The spec's `response`/`notification`/`acknowledge` envelopes aren't built yet, so replies are still a temporary ad-hoc frame `{ id, status, body }`.

## Welcome handshake

`server.upgrade(req, { data })` is **server-side only** — `ws.data` never reaches the client. So on `open` the server sends a **welcome** frame carrying `clientId` + `heartbeatInterval`; the client caches both, and `connect()` resolves on that welcome (not the raw socket open), rejecting if the first frame isn't a welcome.

## Presence / heartbeat

Presence is **client-driven, reaped server-side**. `createApp` accepts `opts.ws.{ heartbeatInterval = 30_000, disconnectThreshold = 120_000 }` (ms). The client emits a **heartbeat** every `heartbeatInterval`; the server arms a per-connection `setTimeout(disconnectThreshold)` reaper that **any** inbound message resets (self-cleaning via the `close` handler — no global sweep). Every request also carries the cached `clientId`.

See also: [Overview](./overview.md), [Routing](./routing.md), [Middleware](./middleware.md), [Request Flow](./request-flow.md).
