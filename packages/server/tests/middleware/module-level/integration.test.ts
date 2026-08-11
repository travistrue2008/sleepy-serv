import { test, expect } from 'bun:test'
import { createApp } from '../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../helpers'

test('when module-level middleware is defined (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/users', Fmt.Text)

  await app.close(true)

  expect(res.status).toBe(200)
  expect(res.body).toBe('module')
})

test('when module-level middleware is defined (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/users')

  await app.close(true)

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('module')
})
