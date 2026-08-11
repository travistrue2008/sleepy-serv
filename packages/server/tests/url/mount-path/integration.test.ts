import { test, expect } from 'bun:test'
import { createApp } from '../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../helpers'

test('when adding a mount path (REST)', async () => {
  const app = await createApp(0, import.meta.dirname, {
    mountPath: '/test-mount-path',
  })

  const req = createRequestor(app)
  const res = await req.get('/test-mount-path/users', Fmt.Text)

  await app.close(true)

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})

test('when adding a mount path (ws)', async () => {
  const app = await createApp(0, import.meta.dirname, {
    mountPath: '/test-mount-path',
  })

  const ws = await createSocketClient(app, {
    mountPath: '/test-mount-path',
  })

  const msg = await ws.get('/test-mount-path/users')

  await app.close(true)

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('Hello world')
})
