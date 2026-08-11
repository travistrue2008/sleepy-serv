import { describe, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import { Fmt, createRequestor } from '../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

describe('REST', () => {
  test('when a request carries headers', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)

    const res = await req.get('/whoami', Fmt.Json, {
      headers: new Headers({
        authorization: 'Bearer xyz',
      }),
    })

    expect(res).toStrictEqual({
      status: 200,
      body: { auth: 'Bearer xyz' },
    })
  })
})

describe('WebSocket', () => {
  test('when a request carries headers', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.connect(host, port)

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
      status: 200,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: { auth: 'Bearer xyz' },
    })
  })
})
