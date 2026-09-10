import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

describe('REST', () => {
  test('when a request carries a query object', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)

    const result = await client.get('/search', Fmt.Json, {
      query: {
        page: '2',
        term: 'hello',
      },
    })

    await server.kill()

    expect(result.status).toBe(200)

    expect(result.body).toStrictEqual({
      query: {
        page: '2',
        term: 'hello',
      },
    })
  })
})

describe('WebSocket', () => {
  test('when a request carries a query object', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await SleepySocketClient.open('localhost', server.port)

    const result = await client.get('/search', {
      query: {
        page: '2',
        term: 'hello',
      },
    })

    await client.close()
    await server.kill()

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: 200,
      timestamp: result.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        query: {
          page: '2',
          term: 'hello',
        },
      },
    })
  })
})
