import { test, expect } from 'bun:test'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../../helpers'

test('when middleware throws an error (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/', Fmt.Json)

  await server.kill()

  expect(result.status).toBe(500)

  expect(result.body).toStrictEqual({
    message: 'An internal server error occurred',
  })
})

test('when middleware throws an error (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)
  const msg = await ws.get('/')

  await server.kill()

  expect(msg.status).toBe(500)

  expect(msg.body).toStrictEqual({
    message: 'An internal server error occurred',
  })
})
