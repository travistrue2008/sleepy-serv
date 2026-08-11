import { test, expect } from 'bun:test'
import { createApp } from '../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../helpers'

test('when making a request with querystring (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)

  const res = await req.get('/', Fmt.Text, {
    query: {
      userId: '123',
    },
  })

  await app.close(true)

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})

test('when making a request with querystring (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)

  const msg = await ws.get('/', {
    query: {
      userId: 123,
    },
  })

  await app.close(true)

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('Hello world')
})
