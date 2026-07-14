# sleepy-socket Protocol (Epic)

An HTTP-flavored, transport-agnostic message protocol over a single multiplexed
WebSocket. Target: single-instance LAN, Bun runtime, `ws://` scheme. This page captures
the **outstanding** slices of that protocol and the design rationale behind them. What is
already built and shipping (request/response envelope, pending-request registry, welcome
handshake, heartbeat/presence, reconnect, session + ticket reclaim) is documented in
[WebSocket Layer](../architecture/websocket.md); it is not repeated here.

## notification

**Status: built.** The server send interface and the client `notification` event
described below now ship; the built mechanics are summarized in
[WebSocket Layer](../architecture/websocket.md). The design rationale is kept here.

The protocol has two client-initiated halves (`request/response`, built) and one
server-initiated half: the `notification`. A notification is **one-directional,
fire-and-forget, and best-effort**. There is no `acknowledge` or reply type. This mirrors
how real push systems deliver at the last mile (APNs, FCM, Web Push all push
one-directionally down a connection the client holds open) and it is what keeps the
protocol at three types, each with a single honest shape.

A notification is discriminated by a single `event` name, not by HTTP `method` + `route`.
Two reasons. First, a push is an announcement, not an operation: there is no HTTP verb to
put in `method` (`player_joined` is neither a GET nor a POST of anything), and the client
does not file-route notifications by path, so `route` would name nothing routable.
Second, the request half of this protocol already uses `method` for the HTTP verb, so a
notification carrying its own `method` would give one word two meanings across the
protocol. A single past-tense `event` name avoids both problems. The server generates the
notification `id`.

This makes the protocol a deliberate hybrid: the request/response half is HTTP-flavored
(`method` + `route` + `status`, because a client request maps to a routable server
handler), while the notification half is JSON-RPC-notification-flavored (a name plus a
payload, sent fire-and-forget with no reply). The two halves differ because they have
different jobs, not by accident.

```js
const NOTIFICATION = {
  type: 'notification',
  id: 'a71e...-uuid',     // server-generated
  event: 'state_changed', // discriminator (state_changed, player_joined, ...)
  timestamp: '...',
  headers: { },
  body: { },              // payload; e.g. the full state object
}
```

### Server send interface

The server produces notifications through two methods on the `app`:

- `broadcast(event, body)`: send to every connected client.
- `send(clientId, event, body)`: send to one client, addressed by its session `clientId`.

`broadcast` is just `send` fanned out over all clients; the two share the same message
shape and differ only in targeting. There is deliberately no `sendToGroup`: a group send
is nothing more than a loop over `send`, so it would add an interface without adding an
abstraction. An app that needs group semantics keeps its own membership list and loops.

Because notifications are in-session only, a `send` to a `clientId` whose socket is not
currently live throws a `ReferenceError`: a targeted push names a specific client, so
addressing one that is not connected is a caller error rather than something to swallow.
There is no queue that holds it for later delivery. `broadcast` never hits this, since it
only ever sends to the sockets that are currently live.

### Why no reply half

An earlier draft paired notifications with an `acknowledge` (later, a reply). It was
dropped after working through what such a reply would actually buy, and what it would
cost:

- **Presence does not need it.** Liveness is already client-driven via heartbeats; any
  inbound frame resets the reaper. A per-notification ack is just a redundant frame
  resetting a timer heartbeats already reset.
- **Delivery does not need it.** TCP gives ordered, reliable delivery on a live socket,
  and there is no buffer/replay behind an ack to act on a reported loss anyway. An app
  can layer its own recovery on top (see the note below), but the core provides none, so
  an ack would report a loss nothing in the core could act on.
- **A reply would force server-side state.** To correlate a reply to the push that
  prompted it, the server would keep a pending-notification registry plus timeouts, one
  entry per outstanding notification per client. Broadcasting to N clients turns one push
  into N pending entries and N timers. That memory and timer churn buys nothing the two
  points above do not already cover.

When a client genuinely must respond to a notification (the rarer case), it sends a
normal **request**. A request self-routes on `method`+`route` and self-describes in its
`body`, so if it needs to reference the push that prompted it, that id simply travels in
the request. Correlation stays an application concern, surfacing only when a real feature
needs it, rather than a standing cost paid by every notification.

Consequence to keep in mind: with no ack and no server tracking, a **missing** or
**undelivered** notification is not observable to the server. Recovery from a dropped
notification is therefore an **application** concern, not a core one, and deliberately
so: how much state to re-send and when varies too much between apps to abstract usefully.
A drop-in game may want to resend the entire application state; a chat app adding a member
to a group may or may not replay history depending on settings. The core stays
best-effort and leaves recovery to the app, which means a notification must never be the
sole carrier of state the client cannot otherwise recover.

### In-session only

A notification reaches only a client that is currently connected with a live socket.
Unlike OS push (Web Push, APNs, FCM), there is no vendor intermediary holding a
connection and no background context to wake, so a backgrounded or closed client receives
nothing. These are **in-session realtime** messages, not push notifications in the OS
sense. Reaching a disconnected client would be a separate Web Push / APNs / FCM
integration, not an extension of this socket layer.

### Client-side handling

For now the client stays deliberately thin: it exposes a `notification` event
(EventEmitter surface) that application code subscribes to, and hands the subscriber the
notification message. The library does not route, translate, or dispatch notifications;
deciding what a given `event` means and how to apply it is the app's job. Anything richer
(per-event routing, translating the wire message into domain actions, reducer wiring) is
left to the application and is out of scope for the core. How far to take client-side
handling is still open, so the minimal EventEmitter surface is the deliberate starting
point.

## Why not a JSON-RPC library

The pending-request registry is hand-rolled rather than pulled from a JSON-RPC library.
Full frameworks such as rpc-websockets want to own the socket and conflict with Bun's
native WebSocket server; some also cannot issue server-initiated calls, which the
notification type depends on. (json-rpc-2.0's fire-and-forget notifications are not an
objection here: fire-and-forget is exactly the notification model chosen below.)
Decision: keep the custom HTTP-flavored framing (`method`, `route`, `status`) and borrow
only the registry idea. The framing
also lets client-to-server messages drop into the same handler/dispatch core an HTTP
adapter calls: shared logic, not shared endpoints (an HTTP route returns to one caller,
while a socket message often broadcasts).

## The locked-phone case (presence rationale)

This is the motivating scenario for client-driven presence. A locked iOS phone freezes
its JavaScript runtime, so it stops sending heartbeats. A frozen client also does not
reliably send a TCP close, so `onclose` is not a dependable disconnect signal; the
missed-heartbeat timeout is. The server's last-seen for that client goes stale, the
threshold trips, and the client is reaped.

Presence and resilience are **two independent halves on independent clocks**:

- **Server presence** answers "did I hear from this client recently." It reaps handles
  whose last-seen exceeds a threshold. Client-driven (each client reports its own
  liveness) so one chatty client's timing is isolated from the rest, and there is no
  N-way periodic fan-out.
- **Client resilience** answers "did my last request get a response." When a phone
  unlocks, its frozen socket may be dead half-open, so the client needs its own rule: if
  a request's response times out, tear down the possibly half-open socket and open a
  fresh one.

Both halves are required and operate independently. The built implementation of both is
in [WebSocket Layer](../architecture/websocket.md); that page notes the two reapers can
fire in either order, which is why reclaim is gated on the token rather than on the
server having already noticed the drop.

## Identity: the player/user tier (unbuilt)

The phrase "client ID" collapses three distinct concepts. Keeping them separate is the
discipline; conflating them is the trap.

| Identifier | Lifetime | Assigned by | Lives in | Status |
| --- | --- | --- | --- | --- |
| Connection ID | Per-socket, ephemeral; dies on close | Server (Bun per-socket data) | Transport | built |
| Session ID | Stable across reconnects | Server-minted | Message headers | built (as `clientId`) |
| Player / User ID | Game/app domain identity | Application | App state, not the envelope | unbuilt |

The connection and session tiers are built and documented in
[WebSocket Layer](../architecture/websocket.md) (`clientId` is the session identifier
that survives reconnects and drives token reclaim). The outstanding tier is player/user
identity, which stays in **app state** so the protocol remains agnostic and is not
coupled to the trivia game.

**Let the feature define the field.** The trivia app, being unauthenticated,
single-instance, and on a LAN, needs no player id yet. The first feature that genuinely
requires a stable id is "a reconnecting player reclaims their game slot." Build that
feature and the correct id shape falls out of it, rather than adding a speculative
session field whose lifecycle is easy to get wrong.

## See also

- [WebSocket Layer](../architecture/websocket.md): the built slices of this protocol.
- [Errors](../architecture/errors.md): how errors serialize into response frames.
- [Testing](../architecture/testing.md): test styles for the socket layer.
