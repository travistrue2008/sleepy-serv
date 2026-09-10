import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

describe('REST', () => {
  test('when making a POST request with a body', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)

    const result = await client.post('/echo', Fmt.Json, {
      headers: new Headers({
        'content-type': 'application/json;charset=utf-8',
      }),
      body: JSON.stringify({
        count: 3,
        name: 'ada',
      }),
    })

    await server.kill()

    expect(result.status).toBe(201)

    expect(result.body).toStrictEqual({
      received: {
        count: 3,
        name: 'ada',
      },
    })
  })
})

describe('WebSocket', () => {
  test('when making a POST request with a body', async () => {
    const server = await createServer(import.meta.dirname)

    const client = await SleepySocketClient.open(
      'localhost',
      server.port,
    )

    const result = await client.post('/echo', {
      body: {
        count: 3,
        name: 'ada',
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
          count: 3,
          name: 'ada',
        },
      },
    })
  })
})
