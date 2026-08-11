import { test, expect } from 'bun:test'
import { createApp } from '../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../helpers'

import type { NextFn, Request } from '../../../src'

type Accum = {
  output: string
}

test('when app-level middleware is defined (REST)', async () => {
  const app = await createApp(0, import.meta.dirname, {
    middleware: [
      (_req: Request, res: unknown, next: NextFn | null) => next!({
        ...res as Accum,
        output: 'root',
      }),
    ],
  })

  const req = createRequestor(app)
  const res = await req.get('/users', Fmt.Text)

  await app.close(true)

  expect(res.status).toBe(200)
  expect(res.body).toBe('root')
})

test('when app-level middleware is defined (ws)', async () => {
  const app = await createApp(0, import.meta.dirname, {
    middleware: [
      (_req: Request, res: unknown, next: NextFn | null) => next!({
        ...res as Accum,
        output: 'root',
      }),
    ],
  })

  const ws = await createSocketClient(app)
  const msg = await ws.get('/users')

  await app.close(true)

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('root')
})
