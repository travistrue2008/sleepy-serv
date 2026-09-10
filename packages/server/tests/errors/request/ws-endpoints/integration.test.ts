import { describe, test, expect } from 'bun:test'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../../helpers'

type TicketBody = {
  ticket: string
}

const CLIENT_ID_INVALID = 'client-invalid'
const TICKET_INVALID = 'ticket-invalid'
const TOKEN_INVALID = 'token-invalid'

describe('POST', () => {
  test('when requested (REST)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.post('/ws', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(201)

    expect(result.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: null,
    })
  })

  test('when requested (ws)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)
    const msg = await ws.post('/ws')

    await server.kill()

    expect(msg.status).toBe(422)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })
})

describe('PUT', () => {
  test('when the "authorization" header is missing (REST)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)
    const client = createClient(server)

    const result = await client.put(`/ws/${ws.clientId}`, Fmt.Json, {
      headers: new Headers({}),
    })

    await server.kill()

    expect(result.status).toBe(422)

    expect(result.body).toStrictEqual([
      {
        path: 'headers',
        message: `must have required property 'authorization'`,
      },
    ])
  })

  test('when the "authorization" header is missing (ws)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)

    const msg = await ws.put(`/ws/${ws.clientId}`, {
      headers: new Headers({}),
    })

    await server.kill()

    expect(msg.status).toBe(422)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when the "clientId" param is invalid (REST)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)
    const client = createClient(server)

    const result = await client.put(
      `/ws/${CLIENT_ID_INVALID}`,
      Fmt.Json,
      {
        headers: new Headers({
          authorization: `Bearer ${ws.token}`,
        }),
      },
    )

    await server.kill()

    expect(result.status).toBe(404)
    expect(result.body).toBe(null)
  })

  test('when the "clientId" param is invalid (ws)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)

    const msg = await ws.put(`/ws/${CLIENT_ID_INVALID}`, {
      headers: new Headers({
        authorization: `Bearer ${ws.token}`,
      }),
    })

    await server.kill()

    expect(msg.status).toBe(422)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when the "token" header is incorrect (REST)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)
    const client = createClient(server)

    const result = await client.put(
      `/ws/${ws.clientId}`,
      Fmt.Json,
      {
        headers: new Headers({
          authorization: `Bearer ${TOKEN_INVALID}`,
        }),
      },
    )

    await server.kill()

    expect(result.status).toBe(401)

    expect(result.body).toStrictEqual({
      message: 'Invalid token',
    })
  })

  test('when the "token" header is incorrect (ws)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)

    const msg = await ws.put(`/ws/${ws.clientId}`, {
      headers: new Headers({
        authorization: `Bearer ${TOKEN_INVALID}`,
      }),
    })

    await server.kill()

    expect(msg.status).toBe(422)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when requested (REST)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)
    const client = createClient(server)

    const result = await client.put(
      `/ws/${ws.clientId}`,
      Fmt.Json,
      {
        headers: new Headers({
          authorization: `Bearer ${ws.token}`,
        }),
      },
    )

    await server.kill()

    expect(result.status).toBe(200)

    expect(result.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: null,
    })
  })

  test('when requested (ws)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)

    const msg = await ws.put(`/ws/${ws.clientId}`, {
      headers: new Headers({
        authorization: `Bearer ${ws.token}`,
      }),
    })

    await server.kill()

    expect(msg.status).toBe(422)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })
})

describe('GET', () => {
  test('when NO "ticket" querystring (REST)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const result = await client.get('/ws', Fmt.Json)

    await server.kill()

    expect(result.status).toBe(422)

    expect(result.body).toStrictEqual([
      {
        path: 'query',
        message: `must have required property 'ticket'`,
      },
    ])
  })

  test('when NO "ticket" querystring (ws)', async () => {
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)
    const msg = await ws.get('/ws')

    await server.kill()

    expect(msg.status).toBe(422)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when invalid "ticket" querystring (REST)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)

    const result = await client.get('/ws', Fmt.Json, {
      query: {
        ticket: TICKET_INVALID,
      },
    })

    await server.kill()

    expect(result.status).toBe(404)

    expect(result.body).toBe(null)
  })

  test('when invalid "ticket" querystring (ws)', async () => {
    const url = `/ws?ticket=${TICKET_INVALID}`
    const server = await createServer(import.meta.dirname)
    const ws = await createSocketClient(server)
    const msg = await ws.get(url)

    await server.kill()

    expect(msg.status).toBe(422)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when providing a "ticket" querystring (REST)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const ticketResult = await client.post('/ws', Fmt.Json)
    const { ticket } = ticketResult.body as TicketBody

    const result = await client.get('/ws', Fmt.Json, {
      query: {
        ticket,
      },
    })

    await server.kill()

    expect(result.status).toBe(404)

    expect(result.body).toBe(null)
  })

  test('when providing a "ticket" querystring (ws)', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)
    const ws = await createSocketClient(server)
    const ticketResult = await client.post('/ws', Fmt.Json)
    const { ticket } = ticketResult.body as TicketBody

    const msg = await ws.get('/ws', {
      query: {
        ticket,
      },
    })

    await server.kill()

    expect(msg.status).toBe(422)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })
})
