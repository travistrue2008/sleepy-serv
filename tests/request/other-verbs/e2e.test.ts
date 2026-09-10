import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

describe('REST', () => {
  test.each([
    'PUT',
    'PATCH',
    'DELETE',
  ])('when making a %s request', async method => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const verb = method.toLowerCase() as Lowercase<typeof method>
    const fn = client[verb]
    const result = await fn('/resource', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(200)
    expect(result.body).toStrictEqual({ method })
  })
})

describe('WebSocket', () => {
  test.each([
    'PUT',
    'PATCH',
    'DELETE',
  ])('when making a %s request', async method => {
    const server = await createServer(import.meta.dirname)

    const client = await SleepySocketClient.open(
      'localhost',
      server.port,
    )

    const verb = method.toLowerCase() as Lowercase<typeof method>
    const result = await client[verb]('/resource')

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
      body: { method },
    })
  })
})
