import { describe, test, expect } from 'bun:test'
import { StatusCode, createApp } from 'sleepy-serv'
import { Fmt, createRequestor } from '../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

describe('REST', () => {
  test('when making a request on a static route', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/users', Fmt.Json)

    expect(res.status).toBe(StatusCode.Ok)

    expect(res.body).toStrictEqual([
      {
        id: 1,
        firstName: 'Tony',
        lastName: 'Stark',
        email: 'tony.stark@starkindustries.com',
      },
    ])
  })
})

describe('WebSocket', () => {
  test('when making a request on a static route', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.open(host, port)
    const res = await client.get('/users')

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
      body: [
        {
          id: 1,
          firstName: 'Tony',
          lastName: 'Stark',
          email: 'tony.stark@starkindustries.com',
        },
      ],
    })
  })
})
