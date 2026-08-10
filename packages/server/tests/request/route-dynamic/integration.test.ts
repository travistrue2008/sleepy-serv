import { test, expect } from 'bun:test'
import { createApp } from '../../../src'
import { FMT, createRequestor, createSocketClient } from '../../helpers'

test('when making a request with dynamic route param (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/users/123', FMT.TEXT)

  await app.server.stop(true)

  expect(res.status).toBe(200)
  expect(res.body).toBe('Fetching user: 123')
})

test('when making a request with dynamic route param (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users/123')

  await app.server.stop(true)

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('Fetching user: 123')
})
