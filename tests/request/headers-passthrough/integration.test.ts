import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode, createApp } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { Fmt, createRequestor } from '../../helpers'

describe('REST', () => {
  test('when a request carries headers', async () => {
    const app = createApp(0)
    const req = createRequestor(app)

    const res = await req.get('/whoami', Fmt.Json, {
      headers: new Headers({
        authorization: 'Bearer xyz',
      }),
    })

    expect(res).toStrictEqual({
      status: StatusCode.Ok,
      body: { auth: 'Bearer xyz' },
    })
  })
})

describe('WebSocket', () => {
  test('when a request carries headers', async () => {
    const app = createApp(0)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.open(host, port)

    const res = await client.get('/whoami', {
      headers: new Headers({
        authorization: 'Bearer xyz',
      }),
    })

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.Ok,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: { auth: 'Bearer xyz' },
    })
  })
})
