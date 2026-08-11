import { describe, test, expect } from 'bun:test'
import { createRequestor, Fmt } from '../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

import {
  createApp,
  ConflictError,
  InternalServerError,
} from 'sleepy-serv'

describe('REST', () => {
  test('when the handler throws a generic Error', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/boom', Fmt.Text)

    await app.close(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Boom')
  })

  test('when the handler throws a RequestError subclass', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/conflict', Fmt.Json)

    await app.close(true)

    expect(res.status).toBe(ConflictError.status)
    expect(res.body).toStrictEqual({ message: 'nope' })
  })
})

describe('WebSocket', () => {
  test('when the handler throws a generic Error', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port!)
    const res = await client.get('/boom')

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: InternalServerError.status,
      timestamp: res.timestamp,
      headers: {},
      body: 'Boom',
    })
  })

  test('when the handler throws a RequestError subclass', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port!)
    const res = await client.get('/conflict')

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: ConflictError.status,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        message: 'nope',
      },
    })
  })
})
