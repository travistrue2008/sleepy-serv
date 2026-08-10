import { test, expect } from 'bun:test'
import { createApp } from '../../../../src'
import { NotFoundError } from '../../../../src/errors'
import { FMT, createRequestor, createSocketClient } from '../../../helpers'

test('when requested resource is not found (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/users/123/photos', FMT.JSON)

  await app.server.stop(true)

  expect(res.status).toBe(NotFoundError.status)
  expect(res.body).toBe(null)
})

test('when requested resource is not found (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users/123/photos')

  await app.server.stop(true)

  expect(msg.status).toBe(NotFoundError.status)
  expect(msg.body).toBe(null)
})
