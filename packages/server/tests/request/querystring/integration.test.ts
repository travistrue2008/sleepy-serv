import { test, expect } from 'bun:test'

import { StatusCode } from '../../../src'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../helpers'

test('when making a request with querystring (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)

  const result = await client.get('/', Fmt.Text, {
    query: {
      userId: '123',
    },
  })

  await server.kill()

  expect(result.status).toBe(StatusCode.Ok)
  expect(result.body).toBe('Hello world')
})

test('when making a request with querystring (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)

  const msg = await ws.get('/', {
    query: {
      userId: 123,
    },
  })

  await server.kill()

  expect(msg.status).toBe(StatusCode.Ok)
  expect(msg.body).toBe('Hello world')
})
