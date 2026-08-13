import { describe, test, expect } from 'bun:test'
import { createApp, StatusCode } from '../../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../../helpers'

type TicketBody = {
  ticket: string
}

const CLIENT_ID_INVALID = 'client-invalid'
const TICKET_INVALID = 'ticket-invalid'
const TOKEN_INVALID = 'token-invalid'

describe('POST', () => {
  test('when requested (REST)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.post('/ws', Fmt.Json)

    await app.close(true)

    expect(res.status).toBe(201)

    expect(res.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: null,
    })
  })

  test('when requested (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)
    const msg = await ws.post('/ws')

    await app.close(true)

    expect(msg.status).toBe(StatusCode.UnprocessableContent)

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
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)
    const req = createRequestor(app)

    const res = await req.put(`/ws/${ws.clientId}`, Fmt.Json, {
      headers: new Headers({}),
    })

    await app.close(true)

    expect(res.status).toBe(StatusCode.UnprocessableContent)

    expect(res.body).toStrictEqual([
      {
        path: 'headers',
        message: `must have required property 'authorization'`,
      },
    ])
  })

  test('when the "authorization" header is missing (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.put(`/ws/${ws.clientId}`, {
      headers: new Headers({}),
    })

    await app.close(true)

    expect(msg.status).toBe(StatusCode.UnprocessableContent)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when the "clientId" param is invalid (REST)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)
    const req = createRequestor(app)

    const res = await req.put(`/ws/${CLIENT_ID_INVALID}`, Fmt.Json, {
      headers: new Headers({
        authorization: `Bearer ${ws.token}`,
      }),
    })

    await app.close(true)

    expect(res.status).toBe(StatusCode.NotFound)
    expect(res.body).toBe(null)
  })

  test('when the "clientId" param is invalid (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.put(`/ws/${CLIENT_ID_INVALID}`, {
      headers: new Headers({
        authorization: `Bearer ${ws.token}`,
      }),
    })

    await app.close(true)

    expect(msg.status).toBe(StatusCode.UnprocessableContent)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when the "token" header is incorrect (REST)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)
    const req = createRequestor(app)

    const res = await req.put(`/ws/${ws.clientId}`, Fmt.Json, {
      headers: new Headers({
        authorization: `Bearer ${TOKEN_INVALID}`,
      }),
    })

    await app.close(true)

    expect(res.status).toBe(StatusCode.Unauthorized)

    expect(res.body).toStrictEqual({
      message: 'Invalid token',
    })
  })

  test('when the "token" header is incorrect (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.put(`/ws/${ws.clientId}`, {
      headers: new Headers({
        authorization: `Bearer ${TOKEN_INVALID}`,
      }),
    })

    await app.close(true)

    expect(msg.status).toBe(StatusCode.UnprocessableContent)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when requested (REST)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)
    const req = createRequestor(app)

    const res = await req.put(`/ws/${ws.clientId}`, Fmt.Json, {
      headers: new Headers({
        authorization: `Bearer ${ws.token}`,
      }),
    })

    await app.close(true)

    expect(res.status).toBe(200)

    expect(res.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: null,
    })
  })

  test('when requested (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.put(`/ws/${ws.clientId}`, {
      headers: new Headers({
        authorization: `Bearer ${ws.token}`,
      }),
    })

    await app.close(true)

    expect(msg.status).toBe(StatusCode.UnprocessableContent)

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
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/ws', Fmt.Json)

    await app.close(true)

    expect(res.status).toBe(StatusCode.UnprocessableContent)

    expect(res.body).toStrictEqual([
      {
        path: 'query',
        message: `must have required property 'ticket'`,
      },
    ])
  })

  test('when NO "ticket" querystring (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)
    const msg = await ws.get('/ws')

    await app.close(true)

    expect(msg.status).toBe(StatusCode.UnprocessableContent)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when invalid "ticket" querystring (REST)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)

    const res = await req.get('/ws', Fmt.Json, {
      query: {
        ticket: TICKET_INVALID,
      },
    })

    await app.close(true)

    expect(res.status).toBe(StatusCode.NotFound)

    expect(res.body).toBe(null)
  })

  test('when invalid "ticket" querystring (ws)', async () => {
    const url = `/ws?ticket=${TICKET_INVALID}`
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)
    const msg = await ws.get(url)

    await app.close(true)

    expect(msg.status).toBe(StatusCode.UnprocessableContent)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when providing a "ticket" querystring (REST)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const ticketRes = await req.post('/ws', Fmt.Json)
    const { ticket } = ticketRes.body as TicketBody

    const res = await req.get('/ws', Fmt.Json, {
      query: {
        ticket,
      },
    })

    await app.close(true)

    expect(res.status).toBe(StatusCode.NotFound)

    expect(res.body).toBe(null)
  })

  test('when providing a "ticket" querystring (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const ws = await createSocketClient(app)
    const ticketRes = await req.post('/ws', Fmt.Json)
    const { ticket } = ticketRes.body as TicketBody

    const msg = await ws.get('/ws', {
      query: {
        ticket,
      },
    })

    await app.close(true)

    expect(msg.status).toBe(StatusCode.UnprocessableContent)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })
})
