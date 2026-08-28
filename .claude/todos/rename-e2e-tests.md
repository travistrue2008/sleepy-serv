# Rename root-level E2E test files from `integration.test.ts` to `e2e.test.ts`

**Status:** open

## What

Every `integration.test.ts` under `tests/` (the repo root test directory)
should be renamed to `e2e.test.ts`.

## Why

The server package (`packages/server/tests/`) contains true integration
tests. The root `tests/` directory contains end-to-end tests that stand up
both a server and a client. Both currently use the filename
`integration.test.ts`, which makes it hard to tell them apart at a glance.

Renaming the root-level files to `e2e.test.ts` makes the distinction
obvious:

- `packages/server/tests/**/integration.test.ts` -- integration tests
  (server only)
- `tests/**/e2e.test.ts` -- end-to-end tests (server + client)

## Scope

Only files under `tests/` are affected. Server-side
`integration.test.ts` files keep their current name.
