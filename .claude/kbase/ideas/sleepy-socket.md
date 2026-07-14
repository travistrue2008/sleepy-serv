# sleepy-socket Protocol (Epic)

An HTTP-flavored, transport-agnostic message protocol over a single multiplexed
WebSocket. Target: single-instance LAN, Bun runtime, `ws://` scheme. This page captures
the **outstanding** slices of that protocol and the design rationale behind them. What is
already built and shipping (request/response envelope, pending-request registry, welcome
handshake, heartbeat/presence, reconnect, session + ticket reclaim) is documented in
[WebSocket Layer](../architecture/websocket.md); it is not repeated here.

## notification / acknowledge (unbuilt)

The protocol has two interaction patterns: client-initiated `request/response` (built)
and server-initiated `notification/acknowledge` (unbuilt). The symmetry is exact:
**request : response :: notification : acknowledge**. Responses and acknowledgments are
the terminal halves and are never themselves replied to, which is what structurally
prevents an infinite acknowledgment loop (no ack of an ack, so no ack-storm).

A notification is discriminated by its own `event` field, not a reused `route`.
Overloading `route` would conflate two different concepts: a request `route` names a
**server handler** that processes the message, while a notification `event` names a
**client-side reaction**. Keeping them distinct avoids a wrong-abstraction that bites
later. The server generates the notification `id`; the client echoes it on the ack.

```js
const NOTIFICATION = {
  type: 'notification',
  id: 'a71e...-uuid',     // server-generated
  event: 'state_changed', // discriminator (state_changed, player_joined, ...)
  timestamp: '...',
  headers: { },
  body: { },              // payload; e.g. the full state object
}

const ACKNOWLEDGE = {
  type: 'acknowledge',
  id: 'a71e...-uuid',     // echoes the notification id
  timestamp: '...',
  headers: { },
  body: { },
}
```

An ack or response whose `id` matches nothing is silently dropped, never error-replied.
Error-replying to it would reintroduce the acknowledgment loop through a side door. (The
client already applies this rule to responses; see the pending-request registry in
[WebSocket Layer](../architecture/websocket.md).)

## Why not a JSON-RPC library

The pending-request registry is hand-rolled rather than pulled from a JSON-RPC library.
Full frameworks such as rpc-websockets want to own the socket and conflict with Bun's
native WebSocket server; some also cannot issue server-initiated calls, which the
notification type depends on. The transport-agnostic codec json-rpc-2.0 plugs into any
socket, but its notifications are fire-and-forget by spec, which fights the
acknowledged-notification presence design. Decision: keep the custom HTTP-flavored
framing (`method`, `route`, `status`) and borrow only the registry idea. The framing
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

**Translate at the boundary.** The raw wire message is not dispatched directly. If it
were, reducers would depend on transport fields (`type`, `timestamp`, `headers`) and
break the day the protocol changes. Instead `onmessage` maps the notification into a
clean domain action, keeping the store ignorant of transport concerns (the same
shared-core / thin-adapter principle, applied on the client side). The client also sends
the ack here, which is terminal and never acked back.

**Full-state broadcast collapses the router.** Because the app broadcasts the entire
state object on every change, most notifications reduce to a single `state_changed`
event whose reducer simply replaces state. Fine-grained events only earn their place
when the client must react differently to **why** state changed (for example animations
or sounds on a correct answer).

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
