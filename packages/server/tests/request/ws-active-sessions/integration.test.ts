import { test, expect } from 'bun:test'
import { StatusCode, createApp } from '../../../src'

import {
  Fmt,
  createRequestor,
  createSocketClient,
} from '../../helpers'

test('when an endpoint is invoked (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toStrictEqual({ count: 0 })
})

test('when an endpoint is invoked (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.Ok)
  expect(msg.body).toStrictEqual({ count: 1 })
})

test('when a separate socket is connected (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)

  await createSocketClient(app) /* connect socket */

  const res = await req.get('/', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toStrictEqual({ count: 1 })
})

test('when a separate socket is connected (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)

  await createSocketClient(app) /* connect socket */

  const msg = await ws.get('/')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.Ok)
  expect(msg.body).toStrictEqual({ count: 2 })
})
