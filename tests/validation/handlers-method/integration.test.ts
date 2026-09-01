import { describe, test, expect } from 'bun:test'
import { StatusCode, createApp } from 'sleepy-serv'
import { Fmt, createRequestor } from '../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

const BODY_VALID = {
  email: 'tony.stark@starkindustries.com',
}

describe('REST', () => {
  describe('body', () => {
    test('when NO "email" is provided', async () => {
      const app = await createApp(0, import.meta.dirname)
      const req = createRequestor(app)

      const res = await req.post('/users', Fmt.Json, {
        headers: new Headers({
          'content-type': 'application/json;charset=utf-8',
        }),
        body: JSON.stringify({
          ...BODY_VALID,
          email: undefined,
        }),
      })

      await app.close(true)

      expect(res.status).toBe(StatusCode.UnprocessableContent)

      expect(res.body).toStrictEqual([
        {
          path: 'body',
          message: `must have required property 'email'`,
        },
      ])
    })

    test('when "email" is invalid', async () => {
      const app = await createApp(0, import.meta.dirname)
      const req = createRequestor(app)

      const res = await req.post('/users', Fmt.Json, {
        headers: new Headers({
          'content-type': 'application/json;charset=utf-8',
        }),
        body: JSON.stringify({
          ...BODY_VALID,
          email: 'asdf',
        }),
      })

      await app.close(true)

      expect(res.status).toBe(StatusCode.UnprocessableContent)

      expect(res.body).toStrictEqual([
        {
          path: 'body.email',
          message: 'must match format "email"',
        },
      ])
    })

    test('when successful', async () => {
      const app = await createApp(0, import.meta.dirname)
      const req = createRequestor(app)

      const res = await req.post('/users', Fmt.Json, {
        headers: new Headers({
          'content-type': 'application/json;charset=utf-8',
        }),
        body: JSON.stringify(BODY_VALID),
      })

      await app.close(true)

      expect(res.status).toBe(StatusCode.Created)

      expect(res.body).toBe(null)
    })
  })
})

describe('WebSocket', () => {
  describe('body', () => {
    test('when NO "email" is provided', async () => {
      const app = await createApp(0, import.meta.dirname)
      const host = app.server.url.hostname
      const port = app.server.port!
      const client = await SleepySocketClient.open(host, port)

      const res = await client.post('/users', {
        headers: new Headers({
          'content-type': 'application/json;charset=utf-8',
        }),
        body: {
          ...BODY_VALID,
          email: undefined,
        },
      })

      await client.close()
      await app.close(true)

      expect(res).toStrictEqual({
        id: res.id,
        clientId: client.id!,
        type: MessageType.Response,
        timestamp: res.timestamp,
        status: StatusCode.UnprocessableContent,
        headers: {
          'content-type': 'application/json;charset=utf-8',
        },
        body: [
          {
            path: 'body',
            message: `must have required property 'email'`,
          },
        ],
      })
    })

    test('when "email" is invalid', async () => {
      const app = await createApp(0, import.meta.dirname)
      const host = app.server.url.hostname
      const port = app.server.port!
      const client = await SleepySocketClient.open(host, port)

      const res = await client.post('/users', {
        headers: new Headers({
          'content-type': 'application/json;charset=utf-8',
        }),
        body: {
          ...BODY_VALID,
          email: 'asdf',
        },
      })

      await client.close()
      await app.close(true)

      expect(res).toStrictEqual({
        id: res.id,
        clientId: client.id!,
        type: MessageType.Response,
        timestamp: res.timestamp,
        status: StatusCode.UnprocessableContent,
        headers: {
          'content-type': 'application/json;charset=utf-8',
        },
        body: [
          {
            path: 'body.email',
            message: 'must match format "email"',
          },
        ],
      })
    })

    test('when successful', async () => {
      const app = await createApp(0, import.meta.dirname)
      const host = app.server.url.hostname
      const port = app.server.port!
      const client = await SleepySocketClient.open(host, port)

      const res = await client.post('/users', {
        headers: new Headers({
          'content-type': 'application/json;charset=utf-8',
        }),
        body: BODY_VALID,
      })

      await client.close()
      await app.close(true)

      expect(res).toStrictEqual({
        id: res.id,
        clientId: client.id!,
        type: MessageType.Response,
        timestamp: res.timestamp,
        status: StatusCode.Created,
        headers: {},
        body: '',
      })
    })
  })
})
