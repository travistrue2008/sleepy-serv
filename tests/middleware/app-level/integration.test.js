import { describe, test, expect } from 'bun:test'
import { createApp, InternalServerError } from 'sleepy-serv'
import { FMT, createRequestor } from '../../helpers'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

function root (req, _res, next) {
  if (req.query.err !== undefined) {
    throw new Error('Error from root middleware')
  }

  return next(['From root middleware'])
}

describe('REST', () => {
  test('when root middleware errors', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const req = createRequestor(app)
    const res = await req.get('/?err', FMT.TEXT)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error from root middleware')
  })

  test('when root middleware is invoked', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const req = createRequestor(app)
    const res = await req.get('/', FMT.TEXT)

    await app.server.stop(true)

    expect(res.status).toBe(200)
    expect(res.body).toStrictEqual('GET - successful')
  })
})

describe('WebSocket', () => {
  test('when root middleware errors', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.send({
      method: 'GET',
      route: '/',
      query: {
        err: true,
      },
    })

    await client.close()
    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
      status: InternalServerError.status,
      timestamp: res.timestamp,
      headers: {},
      body: 'Error from root middleware',
    })
  })

  test('when root middleware is invoked', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.send({
      method: 'GET',
      route: '/',
    })

    await client.close()
    await app.server.stop(true)

    expect(res.status).toBe(200)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
      status: 200,
      timestamp: res.timestamp,
      headers: {},
      body: 'GET - successful',
    })
  })
})
