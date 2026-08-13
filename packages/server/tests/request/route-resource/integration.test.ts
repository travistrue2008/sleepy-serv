import { test, expect } from 'bun:test'
import { StatusCode, createApp } from '../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../helpers'

test('when making a resource-level request (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/users', Fmt.Text)

  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toBe('Hello world')
})

test('when making a resource-level request (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.Ok)
  expect(msg.body).toBe('Hello world')
})
