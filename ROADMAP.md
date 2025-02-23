# Roadmap

- [ ] Add tests
- [ ] Integrate with GitHub Actions for CI
- [x] Separate the library from the example app
- [x] Convert over to `bun`
- [x] Path prefix (default: `/api`)
- [x] Graceful shutdown (Ctrl+D)
- [ ] Support path param validation (`meta.js`)
- [ ] Support static directories
- [ ] Support CORS
- [ ] Support WebSocket
- [ ] Support Body Parsing
  - [ ] Raw
  - [ ] Binary
  - [ ] JSON
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

- Graceful shutdown of app
