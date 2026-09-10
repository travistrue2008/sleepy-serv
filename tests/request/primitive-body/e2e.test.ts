import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

describe('REST', () => {
  test('when request body is NOT an object', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.post('/echo', Fmt.Json, { body: 42 })

    await server.kill()

    expect(result.status).toStrictEqual(201)

    expect(result.body).toStrictEqual({
      received: 42,
    })
  })

  test('when request body IS an object', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)

    const result = await client.post('/echo', Fmt.Json, {
      headers: new Headers({
        'content-type': 'application/json;charset=utf-8',
      }),
      body: JSON.stringify({
        name: 'John Doe',
      }),
    })

    await server.kill()

    expect(result.status).toStrictEqual(201)

    expect(result.body).toStrictEqual({
      received: {
        name: 'John Doe',
      },
    })
  })
})

describe('WebSocket', () => {
  test('when request body is NOT an object', async () => {
    const server = await createServer(import.meta.dirname)
    const host = 'localhost'
    const port = server.port
    const client = await SleepySocketClient.open(host, port)
    const result = await client.post('/echo', { body: 42 })

    await client.close()
    await server.kill()

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: 201,
      timestamp: result.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        received: 42,
      },
    })
  })

  test('when request body IS an object', async () => {
    const server = await createServer(import.meta.dirname)
    const host = 'localhost'
    const port = server.port
    const client = await SleepySocketClient.open(host, port)

    const result = await client.post('/echo', {
      body: {
        name: 'John Doe',
      },
    })

    await client.close()
    await server.kill()

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: 201,
      timestamp: result.timestamp,
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
