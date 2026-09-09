import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode, createApp } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { Fmt, createRequestor } from '../../helpers'

describe('REST', () => {
  test('when a request carries a query object', async () => {
    const app = createApp(0)
    const req = createRequestor(app)

    const res = await req.get('/search', Fmt.Json, {
      query: {
        page: '2',
        term: 'hello',
      },
    })

    expect(res.status).toBe(StatusCode.Ok)

    expect(res.body).toStrictEqual({
      query: {
        page: '2',
        term: 'hello',
      },
    })
  })
})

describe('WebSocket', () => {
  test('when a request carries a query object', async () => {
    const app = createApp(0)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.open(host, port)

    const res = await client.get('/search', {
      query: {
        page: '2',
        term: 'hello',
      },
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
      body: {
        query: {
          page: '2',
          term: 'hello',
        },
      },
    })
  })
})
