import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

describe('REST', () => {
  test('when a request carries headers', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)

    const result = await client.get('/whoami', Fmt.Json, {
      headers: new Headers({
        authorization: 'Bearer xyz',
      }),
    })

    await server.kill()

    expect(result).toStrictEqual({
      status: StatusCode.Ok,
      body: { auth: 'Bearer xyz' },
    })
  })
})

describe('WebSocket', () => {
  test('when a request carries headers', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await SleepySocketClient.open('localhost', server.port)

    const result = await client.get('/whoami', {
      headers: new Headers({
        authorization: 'Bearer xyz',
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
      body: { auth: 'Bearer xyz' },
    })
  })
})
