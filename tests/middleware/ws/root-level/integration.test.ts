import { describe, test, expect } from 'bun:test'
import { InternalServerError, createApp } from 'sleepy-serv'
import { createRequestor, Fmt } from '../../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

import type { NextFn, Request } from 'sleepy-serv'
import type { TicketBody } from '../../../helpers'

function root (
  req: Request,
  _res: unknown,
  next: NextFn | null,
): Response | Promise<Response> {
  if (req.query.err !== undefined) {
    throw new Error('Middleware error triggered')
  }

  return next!(['From root middleware'])
}

describe('POST', () => {
  test('when middleware errors', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const req = createRequestor(app)
    const res = await req.post('/ws?err', Fmt.Text)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Middleware error triggered')
  })

  test('when middleware is successful', async () => {
    const app = await createApp(0, import.meta.dirname, {
      middleware: [root],
    })

    const req = createRequestor(app)
    const res = await req.post('/ws', Fmt.Json)

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
    const client = await SleepySocketClient.connect(host, app.server.port!)
    const res = await req.put(`/ws/${client.id}?err`, Fmt.Text)

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
    const client = await SleepySocketClient.connect(host, app.server.port!)

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
    const res = await req.get('/ws?ticket=asdf&err', Fmt.Text)

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
    const res = await req.post('/ws', Fmt.Json)
    const { ticket } = res.body as TicketBody
    const ws = new WebSocket(`ws://${host}/ws?ticket=${ticket}`)

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
