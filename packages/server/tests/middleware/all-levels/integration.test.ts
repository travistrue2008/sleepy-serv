import { test, expect } from 'bun:test'
import { StatusCode, createApp } from '../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../helpers'

import type { NextFn, Request } from '../../../src'

type Accum = {
  list: string[]
}

test('when all levels of middleware are defined (REST)', async () => {
  const app = await createApp(0, import.meta.dirname, {
    middleware: [
      (_req: Request, res: unknown, next: NextFn) => next({
        ...res as Accum,
        list: ['root'],
      }),
    ],
  })

  const req = createRequestor(app)
  const res = await req.get('/users', Fmt.Text)

  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toBe('root|parent-meta|sibling-meta|module')
})

test('when all levels of middleware are defined (ws)', async () => {
  const app = await createApp(0, import.meta.dirname, {
    middleware: [
      (_req: Request, res: unknown, next: NextFn) => next({
        ...res as Accum,
        list: ['root'],
      }),
    ],
  })

  const ws = await createSocketClient(app)
  const msg = await ws.get('/users')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.Ok)
  expect(msg.body).toBe('root|parent-meta|sibling-meta|module')
})
