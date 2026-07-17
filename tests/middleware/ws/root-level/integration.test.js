import { describe, test, expect } from 'bun:test'
import { InternalServerError, createApp } from 'sleepy-serv'
import { createRequestor, FMT } from '../../../helpers'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

function root (req, _res, next) {
  if (req.query.err !== undefined) {
    throw new Error('Middleware error triggered')
  }

  return next(['From root middleware'])
}

describe('POST', () => {
  test('when middleware errors', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const req = createRequestor(app)
    const res = await req.post('/ws?err', FMT.TEXT)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Middleware error triggered')
  })

  test('when middleware is successful', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const req = createRequestor(app)
    const res = await req.post('/ws', FMT.JSON)

    await app.server.stop(true)

    expect(res.status).toBe(201)

    expect(res.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: ['From root middleware'],
    })
  })
})

describe('PUT', () => {
  test('when middleware errors', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const req = createRequestor(app)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)
    const res = await req.put(`/ws/${client.clientId}?err`, FMT.TEXT)

    await client.close()
    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Middleware error triggered')
  })

  test('when middleware is successful', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const req = createRequestor(app)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await req.put(`/ws/${client.clientId}`, FMT.JSON, {
      headers: new Headers({
        authorization: `Bearer ${client.token}`,
      }),
    })

    await client.close()
    await app.server.stop(true)

    expect(res.status).toBe(200)

    expect(res.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: ['From root middleware'],
    })
  })
})

describe('GET', () => {
  test('when middleware errors', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const req = createRequestor(app)
    const res = await req.get('/ws?ticket=asdf&err', FMT.TEXT)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Middleware error triggered')
  })

  test('when middleware is successful', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const { host } = app.server.url
    const req = createRequestor(app)
    const res = await req.post('/ws', FMT.JSON)
    const ws = new WebSocket(`ws://${host}/ws?ticket=${res.body.ticket}`)

    const data = await new Promise(resolve => {
      ws.addEventListener('message', event =>
        resolve(JSON.parse(event.data)),
      )
    })

    await app.server.stop(true)

    expect(data).toStrictEqual({
      id: expect.any(String),
      clientId: expect.any(String),
      type: TYPES.WELCOME,
      timestamp: expect.any(String),
      headers: {},
      body: {
        heartbeatInterval: 30_000,
        token: expect.any(String),
      },
    })
  })
})
