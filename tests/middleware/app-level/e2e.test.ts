import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

describe('REST', () => {
  test('when root middleware errors', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.get('/?err', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(500)

    expect(result.body).toStrictEqual({
      message: 'An internal server error occurred',
    })
  })

  test('when root middleware is invoked', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.get('/', Fmt.Text)

    await server.kill()

    expect(result.status).toBe(200)
    expect(result.body).toStrictEqual('GET - successful')
  })
})

describe('WebSocket', () => {
  test('when root middleware errors', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await SleepySocketClient.open('localhost', server.port)

    const result = await client.get('/', {
      query: {
        err: true,
      },
    })

    await client.close()
    await server.kill()

    expect(result.status).toBe(500)

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: 500,
      timestamp: result.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: {
        message: 'An internal server error occurred',
      },
    })
  })

  test('when root middleware is invoked', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await SleepySocketClient.open('localhost', server.port)

    const result = await client.get('/')

    await client.close()
    await server.kill()

    expect(result.status).toBe(200)

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: 200,
      timestamp: result.timestamp,
      headers: {},
      body: 'GET - successful',
    })
  })
})
