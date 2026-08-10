import { describe, test, expect } from 'bun:test'
import { InternalServerError, createApp } from 'sleepy-serv'
import { createRequestor, Fmt } from '../../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

describe('POST', () => {
  test('when middleware errors', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.post('/ws?err', Fmt.Text)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error from POST middleware')
  })

  test('when middleware is successful', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.post('/ws', Fmt.Json)

    await app.server.stop(true)

    expect(res.status).toBe(201)

    expect(res.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: {
        message: 'POST - successful',
      },
    })
  })
})

describe('PUT', () => {
  test('when middleware errors', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)
    const res = await req.put(`/ws/${client.id}?err`, Fmt.Text)

    await client.close()
    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error from PUT middleware')
  })

  test('when middleware is successful', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await req.put(`/ws/${client.id}`, Fmt.Json, {
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
      data: {
        message: 'PUT - successful',
      },
    })
  })
})

describe('GET', () => {
  test('when middleware errors', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/ws?ticket=asdf&err', Fmt.Text)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error from GET middleware')
  })

  test('when middleware is successful', async () => {
    const app = await createApp(0, import.meta.dirname)
    const { host } = app.server.url
    const req = createRequestor(app)
    const res = await req.post('/ws', Fmt.Json)
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
      type: MessageType.Welcome,
      timestamp: expect.any(String),
      headers: {},
      body: {
        heartbeatInterval: 30_000,
        token: expect.any(String),
      },
    })
  })
})
