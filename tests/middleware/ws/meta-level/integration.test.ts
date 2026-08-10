import { describe, test, expect } from 'bun:test'
import { InternalServerError, createApp } from 'sleepy-serv'
import { createRequestor, Fmt } from '../../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

import type { TicketBody } from '../../../helpers'

describe('POST', () => {
  test('when middleware errors (lvl 1)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.post('/ws?err=lvl_1', Fmt.Text)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error Lvl 1')
  })

  test('when middleware errors (lvl 2)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.post('/ws?err=lvl_2', Fmt.Text)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error Lvl 2')
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
      data: ['a', 'b'],
    })
  })
})

describe('PUT', () => {
  test('when middleware errors (lvl 1)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port!)
    const res = await req.put(`/ws/${client.id}?err=lvl_1`, Fmt.Text)

    await client.close()
    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error Lvl 1')
  })

  test('when middleware errors (lvl 2)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port!)
    const res = await req.put(`/ws/${client.id}?err=lvl_2`, Fmt.Text)

    await client.close()
    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error Lvl 2')
  })

  test('when middleware errors (lvl 3)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port!)
    const res = await req.put(`/ws/${client.id}?err=lvl_3`, Fmt.Text)

    await client.close()
    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error Lvl 3')
  })

  test('when middleware is successful', async () => {
    const app = await createApp(0, import.meta.dirname)
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
      data: ['a', 'b', 'c'],
    })
  })
})

describe('GET', () => {
  test('when middleware errors (lvl 1)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/ws?ticket=asdf&err=lvl_1', Fmt.Text)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error Lvl 1')
  })

  test('when middleware errors (lvl 2)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/ws?ticket=asdf&err=lvl_2', Fmt.Text)

    await app.server.stop(true)

    expect(res.status).toBe(InternalServerError.status)
    expect(res.body).toBe('Error Lvl 2')
  })

  test('when middleware is successful', async () => {
    const app = await createApp(0, import.meta.dirname)
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
