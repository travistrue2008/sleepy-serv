import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode, createApp } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { Fmt, createRequestor } from '../../helpers'

describe('REST', () => {
  test('when making request on route with an unsupported method', async () => {
    const app = createApp(0)
    const req = createRequestor(app)
    const res = await req.post('/', Fmt.Json)

    expect(res.status).toBe(StatusCode.MethodNotAllowed)
    expect(res.body).toBe(null)
  })
})

describe('WebSocket', () => {
  test('when making request on route with an unsupported method', async () => {
    const app = createApp(0)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.open(host, port)
    const res = await client.post('/')

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.MethodNotAllowed,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: null,
    })
  })
})
