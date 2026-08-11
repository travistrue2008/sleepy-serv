import { test, expect } from 'bun:test'
import { createApp } from '../../../../src'
import { UnprocessableContentError } from '../../../../src/errors'
import { Fmt, createRequestor, createSocketClient } from '../../../helpers'

test('when a RequestError sub-type is thrown (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(UnprocessableContentError.status)

  expect(res.body).toStrictEqual([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
})

test('when a RequestError sub-type is thrown (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/')

  await app.close(true)

  expect(msg.status).toBe(UnprocessableContentError.status)

  expect(msg.body).toStrictEqual([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
})
