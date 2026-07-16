import { test, expect } from 'bun:test'
import { createApp } from '../../../../src'
import { InternalServerError } from '../../../../src/errors'
import { FMT, createRequestor, createSocketClient } from '../../../helpers'

test('when endpoint does not return a "Response" object (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/', FMT.TEXT)

  await app.server.stop(true)

  expect(res.status).toBe(InternalServerError.status)
  expect(res.body).toBe('Handler does not return a Response object')
})

test('when endpoint does not return a "Response" object (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/')

  await app.server.stop(true)

  expect(msg.status).toBe(InternalServerError.status)
  expect(msg.body).toBe('Handler does not return a Response object')
})
