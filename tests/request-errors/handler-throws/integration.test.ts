import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode, createApp } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { createRequestor, Fmt } from '../../helpers'

describe('REST', () => {
  test('when the handler throws a generic Error', async () => {
    const app = createApp(0)
    const req = createRequestor(app)
    const res = await req.get('/boom', Fmt.Json)

    await app.close(true)

    expect(res.status).toBe(StatusCode.InternalServerError)

    expect(res.body).toStrictEqual({
      message: 'An internal server error occurred',
    })
  })

  test('when the handler throws a RequestError subclass', async () => {
    const app = createApp(0)
    const req = createRequestor(app)
    const res = await req.get('/conflict', Fmt.Json)

    await app.close(true)

    expect(res.status).toBe(StatusCode.Conflict)
    expect(res.body).toStrictEqual({ message: 'nope' })
  })
})

describe('WebSocket', () => {
  test('when the handler throws a generic Error', async () => {
    const app = createApp(0)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.open(host, port)
    const res = await client.get('/boom')

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.InternalServerError,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        message: 'An internal server error occurred',
      },
    })
  })

  test('when the handler throws a RequestError subclass', async () => {
    const app = createApp(0)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.open(host, port)
    const res = await client.get('/conflict')

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.Conflict,
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
