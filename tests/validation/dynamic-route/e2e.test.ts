import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

const USER_ID = '00000000-0000-0000-0000-000000000001'

const BODY_VALID = {
  email: 'tony.stark@starkindustries.com',
}

describe('REST', () => {
  describe('body', () => {
    test('when NO "email" is provided', async () => {
      const server = await createServer(import.meta.dirname)
      const client = createClient(server)

      const result = await client.put(
        `/users/${USER_ID}`,
        Fmt.Json,
        {
          headers: new Headers({
            'content-type': 'application/json;charset=utf-8',
          }),
          body: JSON.stringify({
            ...BODY_VALID,
            email: undefined,
          }),
        },
      )

      await server.kill()

      expect(result.status).toBe(StatusCode.UnprocessableContent)

      expect(result.body).toStrictEqual([
        {
          path: 'body',
          message: `must have required property 'email'`,
        },
      ])
    })

    test('when "email" is invalid', async () => {
      const server = await createServer(import.meta.dirname)
      const client = createClient(server)

      const result = await client.put(
        `/users/${USER_ID}`,
        Fmt.Json,
        {
          headers: new Headers({
            'content-type': 'application/json;charset=utf-8',
          }),
          body: JSON.stringify({
            ...BODY_VALID,
            email: 'asdf',
          }),
        },
      )

      await server.kill()

      expect(result.status).toBe(StatusCode.UnprocessableContent)

      expect(result.body).toStrictEqual([
        {
          path: 'body.email',
          message: 'must match format "email"',
        },
      ])
    })

    test('when successful', async () => {
      const server = await createServer(import.meta.dirname)
      const client = createClient(server)

      const result = await client.put(
        `/users/${USER_ID}`,
        Fmt.Json,
        {
          headers: new Headers({
            'content-type': 'application/json;charset=utf-8',
          }),
          body: JSON.stringify(BODY_VALID),
        },
      )

      await server.kill()

      expect(result.status).toBe(StatusCode.Created)

      expect(result.body).toBe(null)
    })
  })
})

describe('WebSocket', () => {
  describe('body', () => {
    test('when NO "email" is provided', async () => {
      const server = await createServer(import.meta.dirname)
      const host = 'localhost'
      const port = server.port
      const client = await SleepySocketClient.open(host, port)

      const result = await client.put(`/users/${USER_ID}`, {
        headers: new Headers({
          'content-type': 'application/json;charset=utf-8',
        }),
        body: {
          ...BODY_VALID,
          email: undefined,
        },
      })

      await client.close()
      await server.kill()

      expect(result).toStrictEqual({
        id: result.id,
        clientId: client.id!,
        type: MessageType.Response,
        timestamp: result.timestamp,
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
      const server = await createServer(import.meta.dirname)
      const host = 'localhost'
      const port = server.port
      const client = await SleepySocketClient.open(host, port)

      const result = await client.put(`/users/${USER_ID}`, {
        headers: new Headers({
          'content-type': 'application/json;charset=utf-8',
        }),
        body: {
          ...BODY_VALID,
          email: 'asdf',
        },
      })

      await client.close()
      await server.kill()

      expect(result).toStrictEqual({
        id: result.id,
        clientId: client.id!,
        type: MessageType.Response,
        timestamp: result.timestamp,
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
      const server = await createServer(import.meta.dirname)
      const host = 'localhost'
      const port = server.port
      const client = await SleepySocketClient.open(host, port)

      const result = await client.put(`/users/${USER_ID}`, {
        headers: new Headers({
          'content-type': 'application/json;charset=utf-8',
        }),
        body: BODY_VALID,
      })

      await client.close()
      await server.kill()

      expect(result).toStrictEqual({
        id: result.id,
        clientId: client.id!,
        type: MessageType.Response,
        timestamp: result.timestamp,
        status: StatusCode.Created,
        headers: {},
        body: '',
      })
    })
  })
})
