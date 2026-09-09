import { test, expect } from 'bun:test'
import { StatusCode, createApp } from '../../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../../helpers'

test('when a RequestError sub-type is thrown (REST)', async () => {
  const app = createApp(0)
  const req = createRequestor(app)
  const res = await req.get('/', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(StatusCode.UnprocessableContent)

  expect(res.body).toStrictEqual([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
})

test('when a RequestError sub-type is thrown (ws)', async () => {
  const app = createApp(0)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.UnprocessableContent)

  expect(msg.body).toStrictEqual([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
})
