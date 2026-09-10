import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { createServer, createClient, Fmt } from '../../../helpers'

import type { TicketBody } from '../../../helpers'

describe('POST', () => {
  test('when middleware errors (lvl 1)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.post('/ws?err=lvl_1', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(StatusCode.InternalServerError)

    expect(result.body).toStrictEqual({
      message: 'An internal server error occurred',
    })
  })

  test('when middleware errors (lvl 2)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.post('/ws?err=lvl_2', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(StatusCode.InternalServerError)

    expect(result.body).toStrictEqual({
      message: 'An internal server error occurred',
    })
  })

  test('when middleware is successful', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.post('/ws', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(StatusCode.Created)

    expect(result.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: ['a', 'b'],
    })
  })
})

describe('PUT', () => {
  test('when middleware errors (lvl 1)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const wsClient = await SleepySocketClient.open('localhost', server.port)
    const result = await client.put(`/ws/${wsClient.id}?err=lvl_1`, Fmt.Json)

    await wsClient.close()
    await server.kill()

    expect(result.status).toBe(StatusCode.InternalServerError)

    expect(result.body).toStrictEqual({
      message: 'An internal server error occurred',
    })
  })

  test('when middleware errors (lvl 2)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const wsClient = await SleepySocketClient.open('localhost', server.port)
    const result = await client.put(`/ws/${wsClient.id}?err=lvl_2`, Fmt.Json)

    await wsClient.close()
    await server.kill()

    expect(result.status).toBe(StatusCode.InternalServerError)

    expect(result.body).toStrictEqual({
      message: 'An internal server error occurred',
    })
  })

  test('when middleware errors (lvl 3)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const wsClient = await SleepySocketClient.open('localhost', server.port)
    const result = await client.put(`/ws/${wsClient.id}?err=lvl_3`, Fmt.Json)

    await wsClient.close()
    await server.kill()

    expect(result.status).toBe(StatusCode.InternalServerError)

    expect(result.body).toStrictEqual({
      message: 'An internal server error occurred',
    })
  })

  test('when middleware is successful', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const wsClient = await SleepySocketClient.open('localhost', server.port)

    const result = await client.put(
      `/ws/${wsClient.id}`,
      Fmt.Json,
      {
        headers: new Headers({
          authorization: `Bearer ${wsClient.token}`,
        }),
      },
    )

    await wsClient.close()
    await server.kill()

    expect(result.status).toBe(StatusCode.Ok)

    expect(result.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: ['a', 'b', 'c'],
    })
  })
})

describe('GET', () => {
  test('when middleware errors (lvl 1)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.get('/ws?ticket=asdf&err=lvl_1', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(StatusCode.InternalServerError)

    expect(result.body).toStrictEqual({
      message: 'An internal server error occurred',
    })
  })

  test('when middleware errors (lvl 2)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.get('/ws?ticket=asdf&err=lvl_2', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(StatusCode.InternalServerError)

    expect(result.body).toStrictEqual({
      message: 'An internal server error occurred',
    })
  })

  test('when middleware is successful', async () => {
    const server = await createServer(import.meta.dirname)
    const host = `localhost:${server.port}`
    const client = createClient(server)
    const result = await client.post('/ws', Fmt.Json)
    const { ticket } = result.body as TicketBody
    const ws = new WebSocket(`ws://${host}/ws?ticket=${ticket}`)

    const data = await new Promise(resolve => {
      ws.addEventListener('message', event =>
        resolve(JSON.parse(event.data)),
      )
    })

    await server.kill()

    expect(data).toStrictEqual({
      id: expect.any(String),
      clientId: expect.any(String),
      type: MessageType.Welcome,
      timestamp: expect.any(String),
      headers: {},
      body: {
        heartbeatInterval: 30_000,
        token: expect.any(String),
      },
    })
  })
})
