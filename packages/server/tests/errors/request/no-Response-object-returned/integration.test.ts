import { test, expect } from 'bun:test'
import { createApp, StatusCode } from '../../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../../helpers'

test('when endpoint does not return a "Response" object (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(StatusCode.InternalServerError)

  expect(res.body).toStrictEqual({
    message: 'An internal server error occurred',
  })
})

test('when endpoint does not return a "Response" object (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.InternalServerError)

  expect(msg.body).toStrictEqual({
    message: 'An internal server error occurred',
  })
})
