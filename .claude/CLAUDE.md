# CLAUDE.md

## Setup

- Install `bun` v1.2.3, if not already
- Install `codegraph` globally, if not already: `bun add -g @colbymchenry/codegraph`, then `codegraph install`.

## Commands

Install and run tests from the **repo root** (workspace-wide):

```bash
bun install                   # CI uses --frozen-lockfile; installs for all workspace members
bun test                      # run all tests (Bun's built-in runner)
bun test path/to/file.test.js # run a single test file
bun test -t "substring"       # run tests matching a name
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

## Instructions

- **Do not** use em dashes. It is very important that we eliminate using these altogether.
- **DO NOT** make assumptions, and **DO NOT** hallucinate. If you don't know something, then tell me you don't know. It's ok if you don't know the answer.
- I want an objective perspective, so only give me an objective answers. The goal is clarity, and not wishful thinking/comfort. Do not instantly agree with what I’m saying for the sake of agreeing. Be objective. You will act as 3 individuals: the first one gives a response, the second one makes an opposing argument, and the third one acts as the judge who combines the most accurate parts of each argument, and puts them together to form a single answer. Only provide the judge's output.

## Notes

- Contextual knowledge lives in the [`.claude/kbase`](./kbase/index.md) knowledge base. Start with [Architecture Overview](./kbase/architecture/overview.md).
- `.claude/kbase/ideas` is where unimplemented ideas and edge-cases go. It's not guaranteed that those ideas will go anywhere though.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
