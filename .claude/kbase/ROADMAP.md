# Roadmap

- [X] Add tests
- [X] Integrate with GitHub Actions for CI
- [x] Separate the library from the example app
- [x] Convert over to `bun`
- [x] Path prefix (default: `/api`)
- [x] Graceful shutdown (Ctrl+D)
- [ ] Add the `ctx` object
- [ ] Support path param validation (`meta.js`)
- [ ] Support static directories
- [ ] Support CORS
- [ ] Support WebSocket
  - [x] `/ws` upgrade with a per-connection `clientId`
  - [x] File-route request/response frames over the socket (shared middleware chains)
  - [x] Message validation (`request` type; `id` + `clientId` required as uuids)
  - [x] Heartbeat / presence (`opts.ws.heartbeatInterval` + `disconnectThreshold`, welcome frame, server-side reaping)
  - [x] Formal envelopes (`response` + `notification`)
  - [x] Client-resilience (heartbeat ack → half-open detection → reconnect)
  - [ ] Identity model (session + token reclaim built; player/user IDs pending)
- [ ] Support Body Parsing
  - [ ] Raw
  - [ ] Binary
  - [X] JSON
  - [ ] XML
  - [ ] Protobuf
- [x] Middleware
  - [x] App-level middleware
  - [x] Meta-level middleware
  - [x] Module-level middleware
  - [x] Add JSON schema validation
- [x] Narrow down router to only look for the following files:
    - `head.js`
    - `get.js`
    - `post.js`
    - `put.js`
    - `patch.js`
    - `delete.js`
- [x] Error Handling
  - [x] Respond with a 404 if the requested path doesn't exist
  - [x] Respond with a 405 if the requested path exists, but the requested method doesn't for that path
- [ ] CLI
  - [ ] Develop a CLI that can create new projects
  - [ ] CLI command that can create a new project from an OpenAPI spec
  - [ ] CLI command that can export an OpenAPI spec from an existing project
- [ ] Validation
  - [x] Throw an error if a method file doesn't contain an export
  - [x] Leaf-most directories must contain at least one method file
  - [x] Only `meta.js` or method files can exist in the `/api` directory
  - [ ] All top-level directories must be static, resource names
  - [ ] Must alternate between static and dynamic children
  - Examples
    - Bad: `:resourceId`
    - Bad: `resourceName/subResourceName`
    - Bad: `resourceName/:resourceId/:subResourceId`
    - Good: `resourceName`
    - Good: `resourceName/:resourceId`
    - Good: `resourceName/:resourceId/subResourceName`
    - Good: `resourceName/:resourceId/subResourceName/:subResourceId`

## Test Cases

### Initialization Errors

- Method file that doesn't have a default export
- Leaf directory with no method file
- Unsupported file to the `/api` directory

### Endpoint Errors

- Request on resource that throws a sub-type of `RequestError`
- Request on resource that throws a generic `Error`
- Request on resource with middleware that throws an error

### Basic Requests

- Request on root
- Request on dynamic route

### Middleware

- Request on resource with module-level middleware
- Request on resource with sibling-meta-level middleware
- Request on resource with parent-meta-level middleware
- Request on resource with app-level middleware
- Request on resource with all middleware levels
- Request on resource with `meta.js` file that doesn't export `middleware`

### Existence

- Request on resource that doesn't exist
- Request on resource that exists where method doesn't

### URL

- Request on resource with `mountPath` applied
- Request on resource that HAS querystring parameters

### Lifecycle / Resilience (root E2E, real sockets)

- Connect + welcome handshake carries the `clientId` and `heartbeatInterval`
- Heartbeat is acked by the server
- Request times out when the server never replies
- A late reply for an already-timed-out request is dropped
- A willing close (code 1000) makes the `clientId` terminal (reclaim 404s)
- An involuntary drop auto-reconnects and reclaims the same `clientId`
- Concurrent requests drain per `queue` (none / fifo / lifo)
