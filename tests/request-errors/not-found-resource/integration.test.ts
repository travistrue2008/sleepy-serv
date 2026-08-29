import { describe, test, expect } from 'bun:test'
import { createApp, StatusCode } from 'sleepy-serv'
import { Fmt, createRequestor } from '../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

describe('REST', () => {
  test('when making a request on a non-existent route', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/nope', Fmt.Json)

    expect(res.status).toBe(StatusCode.NotFound)
    expect(res.body).toBe(null)
  })
})

describe('WebSocket', () => {
  test('when making a request on a non-existent route', async () => {
    const app = await createApp(0, import.meta.dirname)
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
