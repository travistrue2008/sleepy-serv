import { test, expect } from 'bun:test'
import { StatusCode, createApp } from '../../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../../helpers'

test('when requested method on resource does not exist (REST)', async () => {
  const app = createApp(0)
  const req = createRequestor(app)
  const res = await req.get('/users', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(StatusCode.MethodNotAllowed)
  expect(res.body).toBe(null)
})

test('when requested method on resource does not exist (ws)', async () => {
  const app = createApp(0)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.MethodNotAllowed)
  expect(msg.body).toBe(null)
})
