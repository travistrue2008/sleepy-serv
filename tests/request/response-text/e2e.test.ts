import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

describe('REST', () => {
  test('when request returns a raw text response', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.get('/', Fmt.Text)

    expect(result.status).toBe(200)
    expect(result.body).toBe('Just text')

    await server.kill()
  })
})

describe('WebSocket', () => {
  test('when request returns a raw text response', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await SleepySocketClient.open('localhost', server.port)
    const result = await client.get('/')

    await client.close()
    await server.kill()

    expect(result).toStrictEqual({
      id: result.id,
      clientId: result.clientId,
      type: MessageType.Response,
      status: 200,
      timestamp: result.timestamp,
      headers: {},
      body: 'Just text',
    })
  })
})
