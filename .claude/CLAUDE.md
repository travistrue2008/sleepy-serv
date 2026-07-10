# CLAUDE.md

## Setup

- Install `bun` v1.2.3, if not already
- Install `codegraph` globally, if not already: `bun add -g @colbymchenry/codegraph`, then `codegraph install`.
- Link packages for E2E tests

## Commands

Install and run tests from the **repo root** (workspace-wide):

```bash
bun install                   # CI uses --frozen-lockfile; installs for all workspace members
bun test                      # run all tests (Bun's built-in runner)
bun test path/to/file.test.js # run a single test file
bun test -t "substring"       # run tests matching a name
bun run link                  # link packages for E2E tests
bunx eslint .                 # lint
```

Run the example app:
```bash
cd packages/server && bun link
cd ../../example && npm link sleepy-serv
bun --watch run start   # from example/
```

## Verification

Run `bun test` from the repo root before considering any change done. Coverage (text + lcov into `./coverage`) is configured in root `bunfig.toml` and is only picked up when run from the repo root.

New functionality must be covered by new tests — see `.claude/rules/testing.md` for test styles and test-writing conventions (auto-loads whenever a `*.test.js` file is in play).

## Notes

Contextual knowledge lives in the [`.claude/docs`](./docs/index.md) knowledge base. Start with [Architecture Overview](./docs/architecture/overview.md).
