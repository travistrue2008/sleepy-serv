# WebSocket frames can claim any `clientId`

**Status:** open, untriaged. Deliberately *not* fixed during the
TypeScript conversion.

**Found:** while closing the deferred refinements at the end of the
server conversion (group 1). A fix was written, then reverted, because
it turned out to be half of a protocol decision rather than a typing
cleanup.

## The flaw

The server never checks that the `clientId` on an inbound frame belongs
to the socket the frame arrived on.

`validateMessage` (`messages.ts`) validates `clientId` with
`format: 'uuid'`. That is a *shape* check. Nothing compares it against
`ws.data.clientId`, which is the identity the socket actually
authenticated as when it redeemed its ticket during the upgrade.

So a connected client can send a `request` frame carrying somebody
else's `clientId`, and the server will accept it.

## What that does and does not affect

**Routing is not affected.** Replies go out via `ws.send(...)` on the
same socket the frame arrived on. The `clientId` *field* has never been
used to route anything, so there is no cross-delivery bug here.

**The client never reads it back.** `packages/client/src/index.js`
reads `message.clientId` in exactly one place, line 182, and only from
the `welcome` frame, to learn its own id:

```js
this.#id = message.clientId
```

Responses are correlated by `id`, not `clientId`:

```js
#handleRequest (data) {
  const entry = this.#dispatchedMessages.find(item => item.id === data.id)
```

So today the field on a `response` frame is informational. Nothing
depends on it. That is what makes this low-severity *right now* and also
what makes it easy to get wrong later, if anything ever starts trusting
it.

**Where it does surface:** the `clientId` a client claims is echoed
straight back into the `response` frame. `socket.ts`'s `message`
handler does:

```ts
const { id, clientId } = message                     // client-supplied
const outgoingMsg = await buildOutgoingMessage(id, clientId, res)
```

Every *other* outbound frame (`welcome`, `heartbeat` ack,
`notification`) carries the socket's own identity. The `response` frame
is the odd one out.

## What was tried, and why it was reverted

`buildErrorMessage` was changed to take `ws.data.clientId` instead of
reading the value off the raw frame. That is defensible on its own: the
catch path runs on frames that *failed* validation, so the value there
is entirely untrusted, and the old code needed a
`as Pick<BaseMessage, 'id' | 'clientId'>` cast that the tests actively
disproved (a bare `{type: 'heartbeat'}` frame produced a reply with no
`clientId` at all).

It was reverted because it fixed only the error path and left the
success path echoing the client's value, so the two disagreed. An
inconsistent protocol is worse than either consistent choice, and
picking between them is a protocol decision, not a conversion one.

## Options when this gets triaged

1. **Echo everywhere.** Both paths return the client-supplied value.
   The response mirrors the request. Keeps the cast on the error path,
   and malformed frames keep producing replies with a missing
   `clientId`. This is the current behaviour.

2. **Authenticate everywhere.** Both paths use `ws.data.clientId`. The
   field then always means "the identity this socket authenticated as",
   consistent with every other outbound frame, and the cast disappears.
   Cost: the `ws-message` integration suite pins the echoed value in 23
   assertions, and 2 of them would need to gain a `clientId` key they
   have never had.

3. **Reject mismatches.** Have `validateMessage`, or a check next to
   it, 422 any frame whose `clientId` does not match the socket's. The
   question then stops mattering, because a surviving frame's claim is
   correct by construction. Largest blast radius, and the only option
   that closes the underlying hole rather than routing around it.

Option 3 is the only one that addresses the flaw in the title. 1 and 2
are about presentation.

## Things to check when picking

- `validateMessage(message: RawMessage)` currently has no access to the
  socket, so option 3 needs either a second argument or a separate
  check in `socket.ts`'s `message` handler.
- The `heartbeat` ack path also echoes `message.clientId`
  (`createMessage(clientId, MessageType.Heartbeat, { id })`), so it
  belongs in whatever decision gets made.
- Whether a mismatched `clientId` should be a 422 or a socket close.
  A frame impersonating another client is arguably a protocol
  violation, not a validation failure.

## References

- `packages/server/src/socket.ts` — the `message` handler,
  `buildErrorMessage`, `buildOutgoingMessage`
- `packages/server/src/messages.ts` — `validateMessage`, `SCHEMA_BASE`
- `packages/client/src/index.js:182` — the only place the client reads
  `clientId`
- `packages/server/tests/errors/request/ws-message/integration.test.js`
  — the suite that pins the echoed value
- [WebSocket architecture](../kbase/architecture/websocket.md) for the
  ticket/upgrade flow that establishes `ws.data.clientId`
