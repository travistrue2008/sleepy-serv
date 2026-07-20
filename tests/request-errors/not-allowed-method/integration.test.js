import { describe, test, expect } from 'bun:test'
import { createApp, MethodNotAllowedError } from 'sleepy-serv'
import { FMT, createRequestor } from '../../helpers'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

describe('REST', () => {
  test('when making request on route with an unsupported method', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.post('/', FMT.JSON)

    expect(res.status).toBe(MethodNotAllowedError.status)
    expect(res.body).toBe(null)
  })
})

describe('WebSocket', () => {
  test('when making request on route with an unsupported method', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)
    const res = await client.post('/')

    await client.close()
    await app.server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
      status: MethodNotAllowedError.status,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: null,
    })
  })
})
