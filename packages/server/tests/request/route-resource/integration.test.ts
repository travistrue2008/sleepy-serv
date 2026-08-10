import { test, expect } from 'bun:test'
import { createApp } from '../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../helpers'

test('when making a resource-level request (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/users', Fmt.Text)

  await app.server.stop(true)

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})

test('when making a resource-level request (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users')

  await app.server.stop(true)

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('Hello world')
})
