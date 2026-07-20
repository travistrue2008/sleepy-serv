import { test, expect } from 'bun:test'
import { createApp } from '../../../src'
import { FMT, createRequestor, createSocketClient } from '../../helpers'

test('when app-level middleware is defined (REST)', async () => {
  const app = await createApp(0, import.meta.dirname, {
    middleware: [
      (_req, res, next) => next({
        ...res,
        output: 'root',
      }),
    ],
  })

  const req = createRequestor(app)
  const res = await req.get('/users', FMT.TEXT)

  await app.server.stop(true)

  expect(res.status).toBe(200)
  expect(res.body).toBe('root')
})

test('when app-level middleware is defined (ws)', async () => {
  const app = await createApp(0, import.meta.dirname, {
    middleware: [
      (_req, res, next) => next({
        ...res,
        output: 'root',
      }),
    ],
  })

  const ws = await createSocketClient(app)
  const msg = await ws.get('/users')

  await app.server.stop(true)

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('root')
})
