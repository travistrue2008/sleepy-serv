import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

describe('REST', () => {
  test('when making a request on a dynamic route', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.get('/users/123', Fmt.Json)

    expect(result.status).toBe(StatusCode.Ok)

    expect(result.body).toStrictEqual({
      id: '123',
      firstName: 'Tony',
      lastName: 'Stark',
      email: 'tony.stark@starkindustries.com',
    })

    await server.kill()
  })

})

describe('WebSocket', () => {
  test('when making a request on a dynamic route', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await SleepySocketClient.open('localhost', server.port)
    const result = await client.get('/users/123')

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
        id: '123',
        firstName: 'Tony',
        lastName: 'Stark',
        email: 'tony.stark@starkindustries.com',
      },
    })
  })
})
