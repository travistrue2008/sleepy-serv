# Changelog

All notable changes to `sleepy-serv` and `sleepy-socket` are documented here. Both packages
are versioned in lockstep and released together.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
[Unreleased]: https://github.com/travistrue2008/sleepy-serv/compare/0.6.1...HEAD
[0.6.1]: https://github.com/travistrue2008/sleepy-serv/compare/0.6.0...0.6.1
