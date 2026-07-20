import { describe, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import { FMT, createRequestor } from '../../helpers'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

describe('REST', () => {
  test('when making a request on a dynamic route', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)

    const res = await req.get('/users/123', FMT.JSON)

    expect(res.status).toBe(200)

    expect(res.body).toStrictEqual({
      id: '123',
      firstName: 'Tony',
      lastName: 'Stark',
      email: 'tony.stark@starkindustries.com',
    })
  })

})

describe('WebSocket', () => {
  test('when making a request on a dynamic route', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)
    const res = await client.get('/users/123')

    await client.close()
    await app.server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
      status: 200,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        id: '123',
        firstName: 'Tony',
        lastName: 'Stark',
        email: 'tony.stark@starkindustries.com',
      },
    })
  })
})
