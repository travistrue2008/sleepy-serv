import { describe, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import { FMT, createRequestor } from '../../helpers'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

describe('REST', () => {
  test('when making a POST request with a body', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)

    const res = await req.post('/echo', FMT.JSON, {
      headers: new Headers({
        'content-type': 'application/json;charset=utf-8',
      }),
      body: JSON.stringify({
        count: 3,
        name: 'ada',
      }),
    })

    expect(res.status).toBe(201)

    expect(res.body).toStrictEqual({
      received: {
        count: 3,
        name: 'ada',
      },
    })
  })
})

describe('WebSocket', () => {
  test('when making a POST request with a body', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.post('/echo', {
      body: {
        count: 3,
        name: 'ada',
      },
    })

    await client.close()
    await app.server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
      status: 201,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        received: {
          count: 3,
          name: 'ada',
        },
      },
    })
  })
})
