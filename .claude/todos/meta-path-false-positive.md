# Meta path matching false-positive bug

## Bug

`selectMetaPaths` in `packages/server/src/index.ts` uses simple string `startsWith` to match
meta middleware to routes. This produces false matches when one directory name is a string
prefix of a sibling directory name.

```typescript
function selectMetaPaths (metadata: string[], modulePath: string): string[] {
  return metadata
    .filter(metaPath => modulePath.startsWith(path.dirname(metaPath)))
    .sort((a, b) => a.length - b.length)
}
```

`path.dirname('api/w/meta.ts')` returns `'api/w'`. A module at `'api/ws/get.ts'` passes the
`startsWith('api/w')` check even though `/w` is not an ancestor of `/ws`.

## Fixture to reproduce

Directory: `packages/server/tests/errors/request/meta-false-match/`

```
api/
  w/
    meta.ts
    get.ts
  ws/
    get.ts
```

`api/w/meta.ts`:
```typescript
import type { NextFn, Request } from '../../../../src'

type Accum = { list: string[] }

export const middleware = [
  (_req: Request, res: unknown, next: NextFn) => next({
    ...res as Accum,
    list: [...((res as Accum)?.list ?? []), 'w-meta'],
  }),
]
```

`api/w/get.ts`:
```typescript
export default (_req: unknown, res: unknown) => {
  const accum = res as { list?: string[] }

  return new Response((accum?.list ?? []).join('|'))
}
```

`api/ws/get.ts`:
```typescript
export default (_req: unknown, res: unknown) => {
  const accum = res as { list?: string[] }

  return new Response((accum?.list ?? []).join('|'))
}
```

## Package-level test

`packages/server/tests/errors/request/meta-false-match/integration.test.ts`:
```typescript
import { test, expect } from 'bun:test'
import { StatusCode, createApp } from '../../../../src'
import { Fmt, createRequestor } from '../../../helpers'

test('when a sibling directory name is a string prefix (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)

  const wRes = await req.get('/w', Fmt.Text)
  const wsRes = await req.get('/ws', Fmt.Text)

  await app.close(true)

  expect(wRes.status).toBe(StatusCode.Ok)
  expect(wRes.body).toBe('w-meta')

  expect(wsRes.status).toBe(StatusCode.Ok)
  expect(wsRes.body).toBe('')
})
```

This test currently FAILS: `selectMetaPaths` matches `api/w/meta.ts` against `api/ws/get.ts`
via `'api/ws/get.ts'.startsWith('api/w')` returning `true`.

## E2E test

`tests/meta-false-match/integration.test.ts` (same fixture structure, imports from `sleepy-serv`):
```typescript
import { test, expect } from 'bun:test'
import { StatusCode, createApp } from 'sleepy-serv'
import { Fmt, createRequestor } from '../helpers'

test('when a sibling directory is a string prefix of another (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)

  const wsRes = await req.get('/ws', Fmt.Text)

  await app.close(true)

  expect(wsRes.status).toBe(StatusCode.Ok)
  expect(wsRes.body).toBe('')
})
```

## Fix

Replace `startsWith` with segment-aware matching:

```typescript
// Current (buggy):
modulePath.startsWith(path.dirname(metaPath))

// Fixed:
const dir = path.dirname(metaPath) + '/'
modulePath.startsWith(dir)
```

Or in the new `MetaEntry`-based matching (after the plugin refactor):
```typescript
entry.path === '/' ||
socketRoutePath === entry.path ||
socketRoutePath.startsWith(entry.path + '/')
```
