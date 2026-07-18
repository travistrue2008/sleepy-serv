import { describe, test, expect } from 'bun:test'
import { createApp, UnprocessableContentError } from 'sleepy-serv'
import { FMT, createRequestor } from '../../helpers'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

const USER_ID = '00000000-0000-0000-0000-000000000001'

const BODY_VALID = {
  email: 'tony.stark@starkindustries.com',
}

describe('REST', () => {
  describe('body', () => {
    test('when NO "email" is provided', async () => {
      const app = await createApp(0, import.meta.dirname)
      const req = createRequestor(app)

      const res = await req.put(`/users/${USER_ID}`, FMT.JSON, {
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: JSON.stringify({
          ...BODY_VALID,
          email: undefined,
        }),
      })

      await app.server.stop(true)

      expect(res.status).toBe(UnprocessableContentError.status)

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

      const res = await req.put(`/users/${USER_ID}`, FMT.JSON, {
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: JSON.stringify({
          ...BODY_VALID,
          email: 'asdf',
        }),
      })

      await app.server.stop(true)

      expect(res.status).toBe(UnprocessableContentError.status)

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

      const res = await req.put(`/users/${USER_ID}`, FMT.JSON, {
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: JSON.stringify(BODY_VALID),
      })

      await app.server.stop(true)

      expect(res.status).toBe(201)

      expect(res.body).toBe(null)
    })
  })
})

describe('WebSocket', () => {
  describe('body', () => {
    test('when NO "email" is provided', async () => {
      const app = await createApp(0, import.meta.dirname)
      const host = app.server.url.hostname
      const client = await SleepySocketClient.connect(host, app.server.port)

      const res = await client.send({
        method: 'PUT',
        route: `/users/${USER_ID}`,
        headers: {
          'content-type': 'application/json',
        },
        body: {
          ...BODY_VALID,
          email: undefined,
        },
      })

      await client.close()
      await app.server.stop(true)

      expect(res).toStrictEqual({
        id: res.id,
        clientId: client.id,
        type: TYPES.RESPONSE,
        timestamp: res.timestamp,
        status: UnprocessableContentError.status,
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
      const client = await SleepySocketClient.connect(host, app.server.port)

      const res = await client.send({
        method: 'PUT',
        route: `/users/${USER_ID}`,
        headers: {
          'content-type': 'application/json',
        },
        body: {
          ...BODY_VALID,
          email: 'asdf',
        },
      })

      await client.close()
      await app.server.stop(true)

      expect(res).toStrictEqual({
        id: res.id,
        clientId: client.id,
        type: TYPES.RESPONSE,
        timestamp: res.timestamp,
        status: UnprocessableContentError.status,
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
      const client = await SleepySocketClient.connect(host, app.server.port)

      const res = await client.send({
        method: 'PUT',
        route: `/users/${USER_ID}`,
        headers: {
          'content-type': 'application/json',
        },
        body: BODY_VALID,
      })

      await client.close()
      await app.server.stop(true)

      expect(res).toStrictEqual({
        id: res.id,
        clientId: client.id,
        type: TYPES.RESPONSE,
        timestamp: res.timestamp,
        status: 201,
        headers: {},
        body: '',
      })
    })
  })
})
