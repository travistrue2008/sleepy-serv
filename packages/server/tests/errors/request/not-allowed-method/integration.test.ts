import { test, expect } from 'bun:test'
import { createApp, StatusCode } from '../../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../../helpers'

test('when requested method on resource does not exist (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/users', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(StatusCode.MethodNotAllowed)
  expect(res.body).toBe(null)
})

test('when requested method on resource does not exist (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.MethodNotAllowed)
  expect(msg.body).toBe(null)
})
