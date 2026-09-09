import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode, createApp } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { Fmt, createRequestor } from '../../helpers'

describe('REST', () => {
  test('when request returns a JSON response', async () => {
    const app = createApp(0)
    const req = createRequestor(app)

    const res = await req.get('/', Fmt.Json)

    expect(res.status).toBe(StatusCode.Ok)

    expect(res.body).toStrictEqual({
      message: 'JSON-encoded message',
    })
  })
})

describe('WebSocket', () => {
  test('when request returns a JSON response', async () => {
    const app = createApp(0)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.open(host, port)
    const res = await client.get('/')

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: res.clientId,
      type: MessageType.Response,
      status: StatusCode.Ok,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        message: 'JSON-encoded message',
      },
    })
  })
})
