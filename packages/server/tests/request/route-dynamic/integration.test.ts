import { test, expect } from 'bun:test'
import { StatusCode, createApp } from '../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../helpers'

test('when making a request with dynamic route param (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/users/123', Fmt.Text)

  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toBe('Fetching user: 123')
})

test('when making a request with dynamic route param (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users/123')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.Ok)
  expect(msg.body).toBe('Fetching user: 123')
})
