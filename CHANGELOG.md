# Changelog

All notable changes to `sleepy-serv` and `sleepy-socket` are documented here. Both packages
are versioned in lockstep and released together.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`query(fn)` on `SocketCommands`.** Filters active sessions and
  returns `SessionEntry[]` (`{ clientId, app }`), providing read-only
  inspection without leaking internal socket handles.

- **`SessionEntry` type exported from `sleepy-serv`.** The return shape
  of `query()`: `{ clientId: string, app: unknown }`.

### Changed

- **Breaking (`sleepy-serv`):** `drop(clientId, code?, reason?)`
  replaced with `drop(fn, code?, reason?)`. All dropping is now
  filter-based, like `send()`. To drop one client:
  `ws.drop(id => id === targetId)`.

## [0.12.0] - 2026-09-03

### Added

- **`req.ws` in endpoint handlers.** Endpoint handlers (both HTTP and
  WebSocket) now have access to WebSocket commands via `req.ws`. Handlers
  can call `req.ws.send()`, `req.ws.broadcast()`, and `req.ws.drop()`
  directly, enabling server-push as a side effect of handling a request.

- **`FilterFn` receives `index`.** The filter function passed to
  `ws.send(fn, event, body)` now receives a third argument: the
  zero-based index of the client in the active sessions iteration.

### Changed

- **Breaking (`sleepy-serv`):** `app.commands` renamed to `app.ws`.
  The `SocketCommands` type is unchanged.

- **Breaking (`sleepy-serv`):** `send(clientId, event, body)` removed.
  `sendToGroup(fn, event, body)` renamed to `send(fn, event, body)`. All
  sending is now filter-based. To target one client:
  `ws.send(id => id === targetId, event, body)`.

- **Breaking (`sleepy-serv`):** `req.ws.active` removed. The active
  sessions map is no longer exposed on the request object. Use the
  commands (`req.ws.send`, `req.ws.broadcast`, `req.ws.drop`) instead.

- **`ActiveSessions` type no longer exported.** It was only used by
  `req.ws.active`, which has been removed.

## [0.11.0] - 2026-09-03

### Fixed

- **`HttpMethod` runtime export restored.** The runtime value export of
  `HttpMethod` from `sleepy-serv` was accidentally dropped during the
  TypeScript migration, leaving only a type export. Consumers using
  `HttpMethod.Get` at runtime would get a reference error. The value is
  now re-exported alongside `StatusCode`, `CloseCode`, and `CloseReason`.

## [0.10.0] - 2026-09-02

### Added

- **Connection context (`ctx`).** `OpenOptions.ctx` lets the client attach
  arbitrary app data to the initial connection. The server stores it in
  `ws.data.app` and preserves it through inactive sessions. `PUT` reclaim
  sends no body; the server is the source of truth for app data.

- **Close codes and reasons.** `CloseCode` (exported from both packages)
  has three members: `Ok` (1000), `Abnormal` (1006), and `Reaped` (4999).
  `CloseReason` (server only) has four: `Ok`, `Dropped`, `Reaped`, and
  `Superseded`. Protocol-level codes count down from 4999; app codes start
  at 4000.

- **Socket lifecycle hooks.** `createApp` accepts `opts.ws.onOpen` and
  `opts.ws.onClose`. `onOpen(clientId)` fires after the welcome message is
  sent. `onClose(clientId, reason)` fires during the close handler. Both
  are wrapped in try/catch so a throwing hook does not break the connection
  lifecycle.

- **`commands.drop(clientId, code?, reason?)`.** Closes a client's
  connection from the server side. Default code is `CloseCode.Ok` (1000),
  which tells the client not to reconnect. Passing a custom code (e.g.
  4000) allows the client to reconnect.

- **`commands.sendToGroup(fn, event, body)`.** Sends a notification to a
  filtered subset of connected clients. The filter function receives
  `(clientId, data)` and returns a boolean.

- **Client state getters.** `isConnecting` (true during `#establish()`),
  `isReconnecting` (true when a reconnect timer is pending and the client
  is not connected).

- **`HandshakeError`.** Exported from `sleepy-socket`. Thrown when the
  server rejects a handshake with a non-ok HTTP response and a JSON body.
  Carries `status` and `body`. During reconnect, a `HandshakeError` is
  treated as terminal (no retry).

### Changed

- **Breaking (`sleepy-socket`):** `SleepySocketClient.connect()` renamed
  to `SleepySocketClient.open()`. The `ConnectOptions` type is now
  `OpenOptions`.

- **Breaking (`sleepy-socket`):** the client `disconnect` event is now
  `close`. Use `client.on('close', handler)` instead of
  `client.on('disconnect', handler)`.

- **Breaking (`sleepy-serv`):** `commands.disconnect()` renamed to
  `commands.drop()`.

- **Breaking (`sleepy-serv`):** `disconnectThreshold` option renamed to
  `dropThreshold`.

- **Breaking (both):** `CloseCode.Normal` renamed to `CloseCode.Ok`.

- **Breaking (`sleepy-serv`):** `CloseReason.Willing` renamed to
  `CloseReason.Ok`.

- **Close-code-based reconnect.** The client now reconnects based on the
  close code, not just the `#closing` flag. Code 1000 (`CloseCode.Ok`) is
  terminal. Non-1000 codes (network drop, reap, app-level kick) trigger
  reconnect.

- **`client.close()` is truly async.** The returned promise resolves only
  after the socket's `close` event fires. The `close` event is guaranteed
  to fire before the promise resolves.

- **The client `close` event fires on all closes.** Client-initiated,
  server-initiated, and reconnect-eligible closes all emit the event. This
  is for centralized cleanup (removing a player from a lobby, updating UI).

- **Bun 1.4.0.** The minimum Bun version is now 1.4.0. This fixes a bug
  where `server.stop()` never resolved after a server-initiated
  `ws.close()` (Bun #36223).

## [0.9.0] - 2026-08-13

### Added

- `sleepy-socket` now exports `StatusCode`, a const object and matching type covering the
  full range of HTTP status codes. This mirrors the codes `sleepy-serv` already used
  internally, so client code can reference statuses by name instead of by number.

### Changed

- `InternalServerError`'s constructor no longer accepts a `message` or `ctx` argument. It
  now always carries the fixed message `An internal server error occurred` and no longer
  has a `ctx` field. Callers constructing `InternalServerError` directly with either
  argument need to drop them.

- `sleepy-serv`'s HTTP and WebSocket error handlers now normalize any thrown error that
  isn't a `RequestError` into an `InternalServerError` before responding, so both paths
  always return a consistent shape.

  Previously an unexpected HTTP error produced a bare-text 500 response, and an unexpected
  WebSocket error produced a response message with no headers and the raw error message as
  its body. Both now respond with `Response.json`-equivalent output: a
  `content-type: application/json;charset=utf-8` header and a JSON body built from
  `InternalServerError`'s output, matching how `RequestError` subclasses were already
  handled.

## [0.8.0] - 2026-08-12

### Added

- `sleepy-serv` apps now expose `close(force?)`, an `async` teardown that shuts the app
  down and releases everything it holds: it detaches and closes the Ctrl+D shutdown
  handler, restores the terminal's raw mode, stops the server, and awaits `onClose`.

  `force` is passed straight through to `server.stop()`, so it behaves exactly as it does
  in `Bun.serve()` and defaults to `false`. Prefer this over `app.server.stop()`, which
  stops the HTTP listener but leaves the app's `stdin` handler attached.

### Changed

- `sleepy-serv` only installs the Ctrl+D shutdown handler when `stdin` is a TTY.

  Reaching EOF on a piped `stdin` previously ran that same graceful shutdown, ending in
  the `process.exit(0)` that closes it out, so anything signalling shutdown by closing
  `stdin` needs a different signal now. Inside a test runner the old behaviour was a
  hazard rather than a feature: a process that hit EOF on `stdin` part way through a run
  exited 0 and still reported passing.

### Fixed

- `sleepy-serv` no longer leaks a `readline` handle on `stdin`.

  The interface was created at module scope, so it was a side effect of importing the
  package rather than of `createApp()`, and nothing ever closed it. Creating it attaches
  to `stdin` and resumes it, which keeps the handle referenced and the process alive, and
  `app.server.stop()` was never related to it. Importing the package and calling nothing
  at all was enough to hold a process open for as long as `stdin` stayed open, which is
  why suites that start and stop a server per test saw handles left open at exit.

  The interface now belongs to the app that creates it, and `app.close()` releases it.

- `sleepy-serv` no longer accumulates `close` listeners across `createApp()` calls.

  Every call attached another handler to the one shared module-scope interface, so a
  suite that opened and closed an app per test emitted a `MaxListenersExceededWarning` on
  the eleventh.

## [0.7.0] - 2026-08-10

### Added

- `sleepy-socket` now ships TypeScript declarations. The package compiles to `dist/`, and
  the declarations cover its whole public surface, including the types `ConnectOptions`,
  `ReconnectOptions`, `RequestOptions`, `ResponseMessage`, `NotificationMessage`,
  `EventHandler`, `TicketData`, `Queue`, `MessageType`, `IdGenerator`, `Message`,
  `MessageHeaders`, `MessageOptions`, `TimeoutHandle`, and `IntervalHandle`.

  Resolution is conditional: Bun loads the TypeScript source directly, while Node and
  browser bundlers get the compiled ESM output. Both trees ship, so source maps and
  declaration maps resolve to real sources for consumers. `engines.node` is now `>=22`,
  which is where global `WebSocket` stabilized.

- `sleepy-socket` exports `defaultIdGenerator`, the `() => crypto.randomUUID()` function
  the client uses until `setIdGenerator()` replaces it.

  This exists so callers can restore the original behaviour by reference rather than
  hand-rolling a replacement that would drift if the default ever changes. It matters
  because `crypto.randomUUID()` requires a secure context, so a browser served over plain
  `http://` outside localhost needs `setIdGenerator()` and may want to restore afterwards.

- `sleepy-serv` now ships TypeScript declarations, generated into `dist/` alongside the
  `.ts` sources the package already publishes.

  Consumers previously typechecked our source under their own `tsconfig`, so a project
  stricter than ours saw errors originating inside the dependency. The declarations remove
  that. Resolution stays on source at runtime, since `Bun.serve` means every consumer runs
  Bun; only the `types` condition points at `dist`.

- `sleepy-serv` exports `StatusCode` and `HttpMethod` as runtime values, plus the types
  `App`, `AppOptions`, `EndpointRequest`, `Request`, `WebSocketRequest`, `Middleware`,
  `NextFn`, `Server`, `SocketOptions`, `SocketCommands`, `FormattedError`,
  `FormatterField`, `FormatterSchema`, and `ValidationSchemas`.

  `StatusCode` is the comprehensive 1xx through 5xx set and is the single source of truth
  for status numbers in the package, including the `status` getter on every error class.
  The types are what you need to author your own `get.ts` / `meta.ts` route files and
  middleware.

### Changed

- `sleepy-serv` publishes TypeScript sources instead of JavaScript, and its `exports` is
  now a conditional map (`types`, `bun`, `default`) rather than the single
  `./src/index.js` string.

  This is not expected to break anyone: the package calls `Bun.serve`, so it has never
  been able to run on Node regardless of the source form. What changes is where a
  non-Bun runtime fails, from a runtime error inside `Bun.serve` to a module-load error.

- **Breaking (`sleepy-socket`):** the exported `TYPES` object is now `MessageType`, and its
  members are PascalCase instead of SCREAMING_SNAKE. `TYPES.WELCOME` becomes
  `MessageType.Welcome`, and likewise for `HEARTBEAT`, `REQUEST`, `RESPONSE`, and
  `NOTIFICATION`.

  The wire values are unchanged (`'welcome'`, `'heartbeat'`, `'request'`, `'response'`,
  `'notification'`), so this is a source-level rename only. There is no protocol change,
  and a client and server on opposite sides of this release still interoperate.

  To migrate, change `import SleepySocketClient, { TYPES } from 'sleepy-socket'` to
  `import SleepySocketClient, { MessageType } from 'sleepy-socket'` and update the member
  names. Anything comparing against the raw strings needs no change.

  This aligns the client with `sleepy-serv`, which already exports `MessageType` with the
  same members and the same values.

- **Breaking (`sleepy-socket`):** the exported `QUEUE` object is now `Queue`, and its
  members are PascalCase instead of SCREAMING_SNAKE. `QUEUE.NONE`, `QUEUE.FIFO`, and
  `QUEUE.LIFO` become `Queue.None`, `Queue.Fifo`, and `Queue.Lifo`.

  As with `MessageType`, the values are unchanged (`'none'`, `'fifo'`, `'lifo'`), so code
  passing a raw string to the `queue` option keeps working.

  To migrate, change `import SleepySocketClient, { QUEUE } from 'sleepy-socket'` to
  `import SleepySocketClient, { Queue } from 'sleepy-socket'` and update the member names.

  Both renames follow one convention: enum-like constant objects are PascalCase with
  PascalCase members. Plain array and scalar constants keep SCREAMING_SNAKE.

- **Breaking (`sleepy-socket`):** the read-only `secure` property on `SleepySocketClient`
  is now `isSecure`, matching the existing `isConnected` property.

  The `secure` **option** passed to `connect()` is unchanged. Only the property you read
  back off the client was renamed, so `connect(host, port, { secure: true })` still reads
  exactly as before; `client.secure` becomes `client.isSecure`.

## [0.6.2] - 2026-07-20

### Added

- MIT license. Both packages now declare `"license": "MIT"` and ship a `LICENSE`
  file in their published tarballs.

## [0.6.1] - 2026-07-20

- Fixed publish GHA bug

## [0.6.0] - 2026-07-20

### Added

- WebSocket support in `sleepy-serv`. Existing directory-driven routes now serve WebSocket
  traffic as well as HTTP, using the same route table and the same middleware chain, so a
  single method file handles both transports.
- Server-initiated messaging via `app.commands.broadcast(event, body)` and
  `app.commands.send(clientId, event, body)`.
- Connection handshake under `/ws` with identity reclaim, so a client's id survives a
  reconnect. Handshake routes are ordinary middleware chains, so applications can attach auth
  or session data to a connection.
- Socket tuning through `opts.ws`, covering heartbeat interval, disconnect threshold, and
  reclaim TTL.
- New `sleepy-socket` package: a dependency-free client for browsers and bun, with one method
  per HTTP verb, automatic reconnection with backoff, heartbeats, response-ordering policies,
  and a `notification` event for server pushes.
- `QUERY` as a supported verb over WebSocket connections.

### Changed

- **Breaking:** middleware no longer shares a mutable `res` object. Whatever is passed to
  `next(data)` becomes the next middleware's `res`, and the chain starts at `null`. To forward
  `res` unchanged, call `return next(res)` rather than `next()`.
- **Breaking:** middleware exports are flattened and renamed. The `middleware` namespace is
  gone in favor of top-level `parseJsonBody`, `validateSchemas`, and `setValidationFormats`.
- **Breaking:** `/ws` and `/ws/:clientId` are reserved paths. Application routes there now
  merge with the built-in handshake terminals instead of standing alone.
- `createApp()` returns an additional `commands` property.
- The repository is now a bun workspace monorepo. `lib/` moved to `packages/server`, and the
  new client lives in `packages/client`. Published package names and entry points are
  unchanged.
- Releases are published through npm OIDC trusted publishing instead of stored tokens, and are
  triggered by a single manual workflow invocation.

### Removed

- The standalone `example/` application, superseded by the end-to-end test suite which now
  covers both transports.
- The illegal file whitelist, which was already inert on `main`.

## [0.5.0] - 2026-05-13

### Changed

- Loosened validation rules to allow endpoint and meta modules to be TypeScript files rather
  than JavaScript only.

## [0.4.0] - 2026-04-13

### Added

- `next()` in middleware functions, for managing scoped resources.

## [0.3.1] - 2025-07-30

### Removed

- Illegal file checks, allowing tests to be co-located in their respective directories.

## [0.3.0] - 2025-03-11

### Added

- `res` in the middleware chain.

[0.5.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.4.0...0.5.0
[0.4.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.3.1...0.4.0
[0.3.1]: https://github.com/travistrue2008/sleepy-serv/compare/0.3.0...0.3.1
[0.3.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.2.1...0.3.0
[0.6.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.5.0...0.6.0
[0.6.1]: https://github.com/travistrue2008/sleepy-serv/compare/0.6.0...0.6.1
[0.6.2]: https://github.com/travistrue2008/sleepy-serv/compare/0.6.1...0.6.2
[0.7.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.6.2...0.7.0
[0.8.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.7.0...0.8.0
[0.9.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.8.0...0.9.0
[0.10.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.9.0...0.10.0
[0.11.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.10.0...0.11.0
[Unreleased]: https://github.com/travistrue2008/sleepy-serv/compare/0.12.0...HEAD
[0.12.0]: https://github.com/travistrue2008/sleepy-serv/compare/0.11.0...0.12.0
