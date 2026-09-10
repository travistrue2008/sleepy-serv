import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../helpers'

import type { ConnectionData } from './src/auth'

/*
  End-to-end example of JWT auth layered on the middleware system. A single
  `authenticate` guard (see ./auth.ts) sits on the `/protected` route's meta
  chain and enforces a bearer token identically for REST requests and WebSocket
  request frames, because both share the same middleware chain. The `/public`
  route carries no guard, so it stays open to either transport.
 */

describe('REST', () => {
  test('when invoking a protected route omits the token', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.get('/protected', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(StatusCode.Unauthorized)
    expect(result.body).toStrictEqual({ message: 'Missing bearer token' })
  })

  test('when invoking a protected route with INVALID token', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)

    const result = await client.get('/protected', Fmt.Json, {
      headers: new Headers({
        authorization: 'Bearer not-a-real-token',
      }),
    })

    await server.kill()

    expect(result.status).toBe(StatusCode.Unauthorized)
    expect(result.body).toStrictEqual({ message: 'Invalid token' })
  })

  test('when invoking a protected route with a VALID token', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const authResult = await client.post('/auth', Fmt.Text)
    const token = authResult.body

    const result = await client.get('/protected', Fmt.Json, {
      headers: new Headers({
        authorization: `Bearer ${token}`,
      }),
    })

    await server.kill()

    expect(result.status).toBe(StatusCode.Ok)
    expect(result.body).toStrictEqual({ sub: 'user-123' })
  })

  test('when invoking a public route without a token', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.get('/public', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(StatusCode.Ok)
    expect(result.body).toStrictEqual({ ok: true })
  })
})

describe('WebSocket', () => {
  test('when invoking a protected route omits the token', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await SleepySocketClient.open('localhost', server.port)
    const result = await client.get('/protected')

    await client.close()
    await server.kill()

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.Unauthorized,
      timestamp: result.timestamp,
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
    const client = await SleepySocketClient.open('localhost', server.port)

    const result = await client.get('/protected', {
      headers: new Headers({
        authorization: 'Bearer not-a-real-token',
      }),
    })

    await client.close()
    await server.kill()

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.Unauthorized,
      timestamp: result.timestamp,
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
    const client = await SleepySocketClient.open('localhost', server.port)
    const { token } = client.connectionData as ConnectionData

    const result = await client.get('/protected', {
      headers: new Headers({
        authorization: `Bearer ${token}`,
      }),
    })

    await client.close()
    await server.kill()

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.Ok,
      timestamp: result.timestamp,
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
    const client = await SleepySocketClient.open('localhost', server.port)
    const result = await client.get('/public')

    await client.close()
    await server.kill()

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.Ok,
      timestamp: result.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: { ok: true },
    })
  })
})
