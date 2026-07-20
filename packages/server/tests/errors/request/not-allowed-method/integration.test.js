import { test, expect } from 'bun:test'
import { createApp } from '../../../../src'
import { MethodNotAllowedError } from '../../../../src/errors'
import { FMT, createRequestor, createSocketClient } from '../../../helpers'

test('when requested method on resource does not exist (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/users', FMT.JSON)

  await app.server.stop(true)

  expect(res.status).toBe(MethodNotAllowedError.status)
  expect(res.body).toBe(null)
})

test('when requested method on resource does not exist (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users')

  await app.server.stop(true)

  expect(msg.status).toBe(MethodNotAllowedError.status)
  expect(msg.body).toBe(null)
})
