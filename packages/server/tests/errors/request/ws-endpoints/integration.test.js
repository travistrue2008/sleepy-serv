import { describe, test, expect } from 'bun:test'
import { FMT, createRequestor, createSocketClient } from '../../../helpers'

import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableContentError,
  createApp,
} from '../../../../src'

const CLIENT_ID_INVALID = 'client-invalid'
const TICKET_INVALID = 'ticket-invalid'
const TOKEN_INVALID = 'token-invalid'

describe('POST', () => {
  test('when requested (REST)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.post('/ws', FMT.JSON)

    console.log('url:', app.server.url)

    await app.server.stop(true)

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
    const msg = await ws.post('/ws')

    await app.server.stop(true)

    expect(msg.status).toBe(UnprocessableContentError.status)

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

    const res = await req.put(`/ws/${ws.clientId}`, FMT.JSON, {
      headers: new Headers({}),
    })

    await app.server.stop(true)

    expect(res.status).toBe(UnprocessableContentError.status)

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

    await app.server.stop(true)

    expect(msg.status).toBe(UnprocessableContentError.status)

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

    const res = await req.put(`/ws/${CLIENT_ID_INVALID}`, FMT.JSON, {
      headers: new Headers({
        authorization: `Bearer ${ws.token}`,
      }),
    })

    await app.server.stop(true)

    expect(res.status).toBe(NotFoundError.status)
    expect(res.body).toStrictEqual(null)
  })

  test('when the "clientId" param is invalid (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.put(`/ws/${CLIENT_ID_INVALID}`, {
      headers: new Headers({
        authorization: `Bearer ${ws.token}`,
      }),
    })

    await app.server.stop(true)

    expect(msg.status).toBe(UnprocessableContentError.status)

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

    const res = await req.put(`/ws/${ws.clientId}`, FMT.JSON, {
      headers: new Headers({
        authorization: `Bearer ${TOKEN_INVALID}`,
      }),
    })

    await app.server.stop(true)

    expect(res.status).toBe(UnauthorizedError.status)
    expect(res.body).toStrictEqual(null)
  })

  test('when the "token" header is incorrect (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.put(`/ws/${ws.clientId}`, {
      headers: new Headers({
        authorization: `Bearer ${TOKEN_INVALID}`,
      }),
    })

    await app.server.stop(true)

    expect(msg.status).toBe(UnprocessableContentError.status)

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

    const res = await req.put(`/ws/${ws.clientId}`, FMT.JSON, {
      headers: new Headers({
        authorization: `Bearer ${ws.token}`,
      }),
    })

    await app.server.stop(true)

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

    await app.server.stop(true)

    expect(msg.status).toBe(UnprocessableContentError.status)

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
    const res = await req.get('/ws', FMT.JSON)

    await app.server.stop(true)

    expect(res.status).toBe(UnprocessableContentError.status)

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

    await app.server.stop(true)

    expect(msg.status).toBe(UnprocessableContentError.status)

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

    const res = await req.get('/ws', FMT.JSON, {
      query: {
        ticket: TICKET_INVALID,
      },
    })

    await app.server.stop(true)

    expect(res.status).toBe(NotFoundError.status)

    expect(res.body).toStrictEqual(null)
  })

  test('when invalid "ticket" querystring (ws)', async () => {
    const url = `/ws?ticket=${TICKET_INVALID}`
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)
    const msg = await ws.get(url)

    await app.server.stop(true)

    expect(msg.status).toBe(UnprocessableContentError.status)

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

    const { ticket } = await req.post('/ws', FMT.JSON)

    const res = await req.get('/ws', FMT.JSON, {
      query: { ticket },
    })

    await app.server.stop(true)

    expect(res.status).toBe(NotFoundError.status)

    expect(res.body).toStrictEqual(null)
  })

  test('when providing a "ticket" querystring (ws)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)
    const { ticket } = await ws.post('/ws', FMT.JSON, { method: 'POST' })
    const msg = await ws.get('/ws', { query: { ticket } })

    await app.server.stop(true)

    expect(msg.status).toBe(UnprocessableContentError.status)

    expect(msg.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })
})
