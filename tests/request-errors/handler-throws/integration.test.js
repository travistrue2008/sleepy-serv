import { describe, test, expect } from 'bun:test'
import { createRequestor, FMT } from '../../helpers'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

import {
  createApp,
  ConflictError,
  InternalServerError,
} from 'sleepy-serv'

describe('REST', () => {
  test('when the handler throws a generic Error', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/boom', FMT.TEXT)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Boom')
  })

  test('when the handler throws a RequestError subclass', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/conflict', FMT.JSON)

    await app.server.stop(true)

    expect(res.status).toBe(ConflictError.status)
    expect(res.body).toStrictEqual({ message: 'nope' })
  })
})

describe('WebSocket', () => {
  test('when the handler throws a generic Error', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.send({
      method: 'GET',
      route: '/boom',
    })

    await client.close()
    await app.server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
      status: InternalServerError.status,
      timestamp: res.timestamp,
      headers: {},
      body: 'Boom',
    })
  })

  test('when the handler throws a RequestError subclass', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.send({
      method: 'GET',
      route: '/conflict',
    })

    await client.close()
    await app.server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
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
