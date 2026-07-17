import { describe, test, expect } from 'bun:test'
import { FMT, createRequestor } from '../helpers'
import { UnauthorizedError, createApp } from 'sleepy-serv'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

/*
  End-to-end example of JWT auth layered on the middleware system. A single
  `authenticate` guard (see ./auth.js) sits on the `/protected` route's meta
  chain and enforces a bearer token identically for REST requests and WebSocket
  request frames, because both share the same middleware chain. The `/public`
  route carries no guard, so it stays open to either transport.
 */

describe('REST', () => {
  test('when invoking a protected route omits the token', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/protected')

    await app.server.stop(true)

    expect(res.status).toBe(UnauthorizedError.status)
    expect(res.body).toStrictEqual({ message: 'Missing bearer token' })
  })

  test('when invoking a protected route with INVALID token', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)

    const res = await req.get('/protected', FMT.JSON, {
      headers: new Headers({
        authorization: 'Bearer not-a-real-token',
      }),
    })

    await app.server.stop(true)

    expect(res.status).toBe(UnauthorizedError.status)
    expect(res.body).toStrictEqual({ message: 'Invalid token' })
  })

  test('when invoking a protected route with a VALID token', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const authRes = await req.post('/auth', FMT.TEXT)
    const token = authRes.body

    const res = await req.get('/protected', FMT.JSON, {
      headers: new Headers({
        authorization: `Bearer ${token}`,
      }),
    })

    await app.server.stop(true)

    expect(res.status).toBe(200)
    expect(res.body).toStrictEqual({ sub: 'user-123' })
  })

  test('when invoking a public route without a token', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/public', FMT.JSON)

    await app.server.stop(true)

    expect(res.status).toBe(200)
    expect(res.body).toStrictEqual({ ok: true })
  })
})

describe('WebSocket', () => {
  test('when invoking a protected route omits the token', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.send({
      method: 'GET',
      route: '/protected',
    })

    await client.close()
    await app.server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
      status: UnauthorizedError.status,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        message: 'Missing bearer token',
      },
    })
  })

  test('when invoking a protected route with INVALID token', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.send({
      method: 'GET',
      route: '/protected',
      headers: {
        authorization: 'Bearer not-a-real-token',
      },
    })

    await client.close()
    await app.server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
      status: UnauthorizedError.status,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        message: 'Invalid token',
      },
    })
  })

  test('when invoking a protected route with a VALID token', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)
    const { token } = client.connectionData

    const res = await client.send({
      method: 'GET',
      route: '/protected',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

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
        sub: 'user-123',
      },
    })
  })

  test('when invoking a public route without a token', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const client = await SleepySocketClient.connect(host, app.server.port)

    const res = await client.send({
      method: 'GET',
      route: '/public',
    })

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
      body: { ok: true },
    })
  })
})
