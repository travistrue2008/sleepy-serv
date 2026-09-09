import { test, expect } from 'bun:test'
import { createApp, StatusCode } from '../../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../../helpers'

test('when middleware throws an error (REST)', async () => {
  const app = createApp(0)
  const req = createRequestor(app)
  const res = await req.get('/', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(StatusCode.InternalServerError)

  expect(res.body).toStrictEqual({
    message: 'An internal server error occurred',
  })
})

test('when middleware throws an error (ws)', async () => {
  const app = createApp(0)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.InternalServerError)

  expect(msg.body).toStrictEqual({
    message: 'An internal server error occurred',
  })
})
