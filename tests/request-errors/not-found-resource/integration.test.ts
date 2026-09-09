import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode, createApp } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { Fmt, createRequestor } from '../../helpers'

describe('REST', () => {
  test('when making a request on a non-existent route', async () => {
    const app = createApp(0)
    const req = createRequestor(app)
    const res = await req.get('/nope', Fmt.Json)

    expect(res.status).toBe(StatusCode.NotFound)
    expect(res.body).toBe(null)
  })
})

describe('WebSocket', () => {
  test('when making a request on a non-existent route', async () => {
    const app = createApp(0)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.open(host, port)
    const res = await client.get('/nope')

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.NotFound,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: null,
    })
  })
})
