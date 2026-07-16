import { test, expect } from 'bun:test'
import { createApp } from '../../../src'
import { FMT, createRequestor, createSocketClient } from '../../helpers'

test('when making a root-level request (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/', FMT.TEXT)

  await app.server.stop(true)

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})

test('when making a root-level request (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/')

  await app.server.stop(true)

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('Hello world')
})
