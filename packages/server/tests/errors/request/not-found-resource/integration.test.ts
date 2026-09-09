import { test, expect } from 'bun:test'
import { StatusCode, createApp } from '../../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../../helpers'

test('when requested resource is not found (REST)', async () => {
  const app = createApp(0)
  const req = createRequestor(app)
  const res = await req.get('/users/123/photos', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(StatusCode.NotFound)
  expect(res.body).toBe(null)
})

test('when requested resource is not found (ws)', async () => {
  const app = createApp(0)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users/123/photos')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.NotFound)
  expect(msg.body).toBe(null)
})
