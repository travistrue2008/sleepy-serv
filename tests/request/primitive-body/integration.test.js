import { describe, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import { FMT, createRequestor } from '../../helpers'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

describe('REST', () => {
  test('when request body is NOT an object', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)

    const res = await req.post('/echo', FMT.JSON, {
      body: 42,
    })

    await app.server.stop(true)

    expect(res.status).toStrictEqual(201)

    expect(res.body).toStrictEqual({
      received: 42,
    })
  })

  test('when request body IS an object', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)

    const res = await req.post('/echo', FMT.JSON, {
      headers: new Headers({
        'content-type': 'application/json;charset=utf-8',
      }),
      body: JSON.stringify({
        name: 'John Doe',
      }),
    })

    await app.server.stop(true)

    expect(res.status).toStrictEqual(201)

    expect(res.body).toStrictEqual({
      received: {
        name: 'John Doe',
      },
    })
  })
})

describe('WebSocket', () => {
  test('when request body is NOT an object', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.post('/echo', {
      body: 42,
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
        received: 42,
      },
    })
  })

  test('when request body IS an object', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.post('/echo', {
      body: {
        name: 'John Doe',
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
          name: 'John Doe',
        },
      },
    })
  })
})
