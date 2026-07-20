# `sleepy-socket`

A WebSocket client for talking to `sleepy-serv` servers

## Important Notes

- This package has zero dependencies, and runs in browsers as well as in [`bun.sh`](https://bun.sh).
- This package is the client half of `sleepy-serv`. It expects a `sleepy-serv` server on the other end.
- Requests are made over a single WebSocket connection, but they're modeled as REST-ful calls with methods, routes, headers, and status codes.

## Installation

```bash
bun add sleepy-socket
```

## Getting Started

Here's a minimalist example on how to connect and make a request:

```js
import SleepySocketClient from 'sleepy-socket'

const client = await SleepySocketClient.connect('localhost', 3000)
const res = await client.get('/users')

console.log(res.status) // 200
console.log(res.body) // the parsed response body

await client.close()
```

`connect()` is the only supported way to create a client. It's `async` because it doesn't resolve until the connection is fully established: it requests a ticket over HTTP, opens the WebSocket, and waits for the server's `welcome` message. Once it resolves, the client is ready to make requests.

### Making Requests

There's one method per HTTP verb: `head()`, `get()`, `post()`, `put()`, `patch()`, and `delete()`. They all take the same two parameters:
- `route`: the route to call, such as `/users` or `/users/123`
- `opts`: an optional object containing `headers`, `query`, and `body`

Each one returns a promise that resolves to the full _response message_, not just the body:

```js
const res = await client.get('/users/123')

console.log(res)
```

That gives you an object shaped like this:

```
{
  id: '2b1f...',           // uuid, matches the request that produced it
  clientId: '9c4e...',     // same as `client.id`
  type: 'response',
  status: 200,
  timestamp: '2026-07-19T...',
  headers: { 'content-type': 'application/json;charset=utf-8' },
  body: { name: 'ada' },
}
```

Note that a failing status does _not_ reject the promise. A _404 NotFound_ or _500 InternalServerError_ resolves normally, with the status on `res.status`. Only transport-level problems reject, such as a timeout or the socket closing mid-flight. This means you check `res.status` rather than wrapping calls in `try`/`catch`:

```js
const res = await client.get('/users/123')

if (res.status === 404) {
  console.log('no such user')
}
```

### Request Options

The second parameter to any request method can contain these optional properties:
- `headers`: a `Headers` instance. Passing anything else throws a `TypeError`.
- `query`: a plain object of query string values
- `body`: the request body, which can be any JSON-serializable value

Here's an example that uses all three:

```js
const res = await client.post('/users', {
  headers: new Headers({
    authorization: `Bearer ${token}`,
  }),
  query: { dryRun: true },
  body: {
    name: 'ada',
    count: 3,
  },
})
```

When `body` is a non-null object, the client sets `content-type` to `application/json;charset=utf-8` for you, unless you already set a `content-type` header yourself.

### Notifications

Servers can push messages that aren't replies to anything. Those arrive as notifications, and you subscribe to them with `on()`:

```js
client.on('notification', message => {
  console.log(message.event) // 'state_changed'
  console.log(message.body) // { score: 1 }
})
```

There's one thing worth pointing out here: `'notification'` is the only event name the client emits. The server's own event name lives on the message's `event` property, so you branch on that inside your handler:

```js
client.on('notification', message => {
  switch (message.event) {
    case 'state_changed':
      return applyState(message.body)

    case 'user_joined':
      return addUser(message.body)
  }
})
```

If one of your handlers throws, the error is caught and logged, and the remaining handlers still receive the message.

### Reconnection

The client reconnects automatically when the socket drops. It reclaims its previous session, so `client.id` stays the same across a reconnect and you don't need to re-establish application state.

You can tune the backoff:

```js
const client = await SleepySocketClient.connect('localhost', 3000, {
  reconnect: {
    minDelay: 1_000,
    maxDelay: 10_000,
    factor: 2,
  },
})
```

Set `reconnect` to `false` to turn it off entirely:

```js
const client = await SleepySocketClient.connect('localhost', 3000, {
  reconnect: false,
})
```

Note that only the literal value `false` disables reconnection. Any other value falls back to the defaults.

### Response Queueing

Requests are sent over one socket, so responses can come back in a different order than they were sent. The `queue` option controls how the client hands those responses back to you.

For example, if you fire three requests that take 300ms, 100ms, and 200ms:

```js
import SleepySocketClient, { QUEUE } from 'sleepy-socket'

const client = await SleepySocketClient.connect('localhost', 3000, {
  queue: QUEUE.FIFO,
})

const results = []

await Promise.all([
  client.get('/', { query: { delay: 300 } }).then(() => results.push(1)),
  client.get('/', { query: { delay: 100 } }).then(() => results.push(2)),
  client.get('/', { query: { delay: 200 } }).then(() => results.push(3)),
])
```

The three queue types resolve those promises differently:
- `QUEUE.NONE`: each promise resolves the moment its response arrives, so `results` is `[2, 3, 1]`. This is the default.
- `QUEUE.FIFO`: responses are held back until every earlier request has resolved, so `results` is `[1, 2, 3]`, matching the order you sent them.
- `QUEUE.LIFO`: responses drain from the most recent request backwards, so `results` is `[3, 2, 1]`.

`QUEUE.NONE` is the right choice most of the time. `QUEUE.FIFO` is useful when responses have to be applied in the order they were requested.

### Mount Paths

If the server was created with a `mountPath`, give the client the same value:

```js
const client = await SleepySocketClient.connect('localhost', 3000, {
  mountPath: '/api/v2',
})

const res = await client.get('/users')
```

The routes you pass to request methods stay mount-relative. The client joins the prefix on internally, so `/users` above is sent as `/api/v2/users`.

## API

### `SleepySocketClient.connect(host, port, opts)`

This static method creates a client, connects it, and resolves once the server has acknowledged the connection. It's the only supported way to construct a client.

The parameters are:
- `host`: the hostname, without a scheme, such as `'localhost'`
- `port`: the port number
- `opts`: an optional options object

The `opts` object can contain these optional properties:
- `queue`: how responses are handed back, one of `QUEUE.NONE`, `QUEUE.FIFO`, or `QUEUE.LIFO`. Defaults to `QUEUE.NONE`. An unrecognized value throws a `RangeError`.
- `secure`: set to `true` to use `https` and `wss` instead of `http` and `ws`. Defaults to `false`.
- `timeout`: how long to wait, in milliseconds, both for the initial connection and for each individual request. Defaults to `30_000`.
- `serverTimeout`: how long the client tolerates silence from the server, in milliseconds, before it considers the connection dead and closes it. Defaults to `120_000`.
- `mountPath`: the server's mount path prefix. Defaults to `''`.
- `reconnect`: an options object for reconnection behavior, or `false` to disable it

The `reconnect` object can contain these optional properties:
- `minDelay`: the starting backoff delay in milliseconds. Defaults to `500`.
- `maxDelay`: the maximum backoff delay in milliseconds. Defaults to `30_000`.
- `factor`: the exponential multiplier applied to the delay after each failed attempt. Defaults to `2`.
- `random`: the jitter source. Defaults to `Math.random`.

### Request Methods

`head(route, opts)`, `get(route, opts)`, `post(route, opts)`, `put(route, opts)`, `patch(route, opts)`, and `delete(route, opts)` all send a request and return a promise resolving to the response message.

They throw synchronously if the client isn't connected, and their promises reject on timeout or if the socket closes before the response arrives.

### `on(event, handler)`

Registers a handler for an event. The only event emitted is `'notification'`. Registering the same function twice is a no-op, since handlers are stored in a set.

### `off(event, handler)`

Removes a previously registered handler. It's safe to call with a handler that was never registered.

### `close()`

Closes the connection and rejects any in-flight requests. It returns a promise, so it's worth awaiting before your process exits.

Note that closing is permanent. There's no reopen, and calling `close()` a second time throws. If you're calling it in a `finally` block, guard it with `isConnected`:

```js
try {
  await doWork(client)
} finally {
  if (client.isConnected) {
    await client.close()
  }
}
```

### Properties

All of these are read-only:
- `id`: the server-assigned client id, which survives reconnects
- `isConnected`: whether the client is currently connected and ready for requests
- `socket`: the underlying `WebSocket`, or `null` while disconnected
- `connectionData`: whatever payload the server attached when the connection was established. This is where application data such as an auth token shows up.
- `token`: the reclaim token used internally to restore the session after a drop. This is not an application auth token; that would be on `connectionData`.
- `queueType`: the configured queue type
- `secure`: whether the connection uses `wss`
- `timeout`: the configured request timeout
- `serverTimeout`: the configured server silence timeout
- `heartbeatInterval`: how often the client sends heartbeats. This is dictated by the server, not configured by you.
- `mountPath`: the configured mount path

### `QUEUE`

Contains the valid values for the `queue` option: `QUEUE.NONE`, `QUEUE.FIFO`, and `QUEUE.LIFO`.

### `TYPES`

Contains the message type names used on the wire: `TYPES.WELCOME`, `TYPES.HEARTBEAT`, `TYPES.REQUEST`, `TYPES.RESPONSE`, and `TYPES.NOTIFICATION`. A response message's `type` is always `TYPES.RESPONSE`, and a notification's is always `TYPES.NOTIFICATION`.

## Errors

Most failures surface as thrown errors or rejected promises:
- `Invalid queue type: <value>`: a `RangeError` thrown by `connect()` when `queue` isn't a valid `QUEUE` value. This is thrown before any network call is made.
- `Connection failed.`: the connection couldn't be established
- `Connection timed out.`: the connection wasn't established within `timeout` milliseconds
- `opts.headers must be a Headers instance`: a `TypeError` thrown when a request's `headers` option isn't a `Headers` object
- `Socket is closed`: thrown when you call a request method while disconnected, or when you call `close()` more than once
- `Request timed out.`: a request didn't get a response within `timeout` milliseconds
- `Socket closed.`: the socket closed while requests were still in flight. Every pending request rejects with this.

Remember that these cover transport failures only. An error _response_ from the server, such as a _404 NotFound_, resolves normally with the status on `res.status`.
