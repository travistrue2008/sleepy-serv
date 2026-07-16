import { describe, test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { UnauthorizedError } from '../../../../packages/server/src/errors'

import {
  makeRequest,
  createServer,
  createSocketClient,
} from '../../helpers'

/*
  End-to-end example of JWT auth layered on the middleware system. A single
  `authenticate` guard (see ./auth.js) sits on the `/protected` route's meta
  chain and enforces a bearer token identically for REST requests and WebSocket
  request frames, because both share the same middleware chain. The `/public`
  route carries no guard, so it stays open to either transport.
 */

describe('REST', () => {
  test('when invoking a protected route omits the token', async () => {
    const server = await createServer(import.meta.dirname)
    const res = await makeRequest(server.port, 'GET', '/protected')

    await server.stop(true)

    expect(res.status).toBe(UnauthorizedError.status)
    expect(res.body).toStrictEqual({ message: 'Missing bearer token' })
  })

  test('when invoking a protected route with INVALID token', async () => {
    const server = await createServer(import.meta.dirname)

    const res = await makeRequest(server.port, 'GET', '/protected', {
      headers: new Headers({
        authorization: 'Bearer not-a-real-token',
      }),
    })

    await server.stop(true)

    expect(res.status).toBe(UnauthorizedError.status)
    expect(res.body).toStrictEqual({ message: 'Invalid token' })
  })

  test('when invoking a protected route with a VALID token', async () => {
    const server = await createServer(import.meta.dirname)

    const authRes = await makeRequest(server.port, 'POST', '/auth', {
      type: 'text',
    })

    const token = authRes.body

    const res = await makeRequest(server.port, 'GET', '/protected', {
      headers: new Headers({
        authorization: `Bearer ${token}`,
      }),
    })

    await server.stop(true)

    expect(res.status).toBe(200)
    expect(res.body).toStrictEqual({ sub: 'user-123' })
  })

  test('when invoking a public route without a token', async () => {
    const server = await createServer(import.meta.dirname)
    const res = await makeRequest(server.port, 'GET', '/public', {})

    await server.stop(true)

    expect(res.status).toBe(200)
    expect(res.body).toStrictEqual({ ok: true })
  })
})

describe('WebSocket', () => {
  test('when invoking a protected route omits the token', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await createSocketClient(server.port)

    const res = await client.send({
      method: 'GET',
      route: '/protected',
    })

    await client.close()
    await server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.clientId,
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
    const server = await createServer(import.meta.dirname)
    const client = await createSocketClient(server.port)

    const res = await client.send({
      method: 'GET',
      route: '/protected',
      headers: {
        authorization: 'Bearer not-a-real-token',
      },
    })

    await client.close()
    await server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.clientId,
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
    const server = await createServer(import.meta.dirname)
    const client = await createSocketClient(server.port)
    const { token } = client.connectionData

    const res = await client.send({
      method: 'GET',
      route: '/protected',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    await client.close()
    await server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.clientId,
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
    const server = await createServer(import.meta.dirname)
    const client = await createSocketClient(server.port)

    const res = await client.send({
      method: 'GET',
      route: '/public',
    })

    await client.close()
    await server.stop(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.clientId,
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
