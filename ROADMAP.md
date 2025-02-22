# Roadmap

- [ ] Add tests
- [ ] Integrate with GitHub Actions for CI
- [x] Separate the library from the example app
- [x] Convert over to `bun`
- [x] Path prefix (default: `/api`)
- [x] Graceful shutdown (Ctrl+D)
- [ ] Support dynamic path validation (`meta.js`)
- [ ] Support static directories
- [ ] Support CORS
- [ ] Support WebSocket
- [ ] Support Body Parsing
  - [ ] Raw
  - [ ] Binary
  - [ ] JSON
  - [ ] XML
  - [ ] Protobuf
- [ ] Middleware
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
  - [ ] Leaf-most directories must contain at least one method file
  - [ ] Throw an error if a method file doesn't contain an export
  - [ ] Directory structure must follow pattern
    - [ ] All root-level directories cannot be dynamic parameters, and must describe a resource name
    - [ ] All sub-directories must be a dynamic parameter that's named after the parent resource's name
    - [ ] All sub-sub-directories must NOT be a dynamic resource
    - Examples
      - Good: `resourceName`
      - Good: `resourceName/:resourceId`
      - Good: `resourceName/:resourceId/subResourceName`
      - Good: `resourceName/:resourceId/subResourceName/:subResourceId`
      - Bad: `:resourceId`
      - Bad: `:resourceId/:subResourceId`
      - Bad: `:resourceId/subResourceName`
      - Bad: `resourceName/subResourceName`
      - Bad: `resourceName/:resourceId/:subResourceId`
      - Bad: `resourceName/:resourceId/:subResourceId`

## Test Cases

- Request on root
- Request on static resource
- Request on nested resource
- Request on dynamic resource

- Request on resource with module-level middleware
- Request on resource with meta-level middleware
- Request on resource with app-level middleware
- Request on resource with module and meta middleware
- Request on resource with meta and app middleware
- Request on resource with app and module middleware
- Request on resource where middleware chain responds early
- Request on resource with `meta.js` file that doesn't export `middleware`

- Request on resource that doesn't exist
- Request on resource that exists where method doesn't

- Request on resource that throws a sub-type of `RequestError`
- Request on resource that throws a generic `Error`
- Request on resource with middleware that throws an error
- Request on resource with endpoint validation

- Request on resource with `mountPath` applied
- Request on resource with NO querystring parameters
- Request on resource that HAS querystring parameters

- Validate directory with no sub-directories and no method file
- Validate method file that doesn't have a default export
- Add an "unsupported" file to the `/api` directory

- Test graceful shutdown of app
