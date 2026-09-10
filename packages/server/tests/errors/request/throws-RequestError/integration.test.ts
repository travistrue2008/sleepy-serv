import { test, expect } from 'bun:test'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../../helpers'

test('when a RequestError sub-type is thrown (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/', Fmt.Json)

  await server.kill()

  expect(result.status).toBe(422)

  expect(result.body).toStrictEqual([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
})

test('when a RequestError sub-type is thrown (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)
  const msg = await ws.get('/')

  await server.kill()

  expect(msg.status).toBe(422)

  expect(msg.body).toStrictEqual([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
})
