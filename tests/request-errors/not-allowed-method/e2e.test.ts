import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

describe('REST', () => {
  test('when making request on route with an unsupported method', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.post('/', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(405)
    expect(result.body).toBe(null)
  })
})

describe('WebSocket', () => {
  test('when making request on route with an unsupported method', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await SleepySocketClient.open('localhost', server.port)
    const result = await client.post('/')

    await client.close()
    await server.kill()

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: 405,
      timestamp: result.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: null,
    })
  })
})
