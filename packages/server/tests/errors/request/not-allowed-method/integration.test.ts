import { test, expect } from 'bun:test'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../../helpers'

test('when requested method on resource does not exist (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/users', Fmt.Json)

  await server.kill()

  expect(result.status).toBe(405)
  expect(result.body).toBe(null)
})

test('when requested method on resource does not exist (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)
  const msg = await ws.get('/users')

  await server.kill()

  expect(msg.status).toBe(405)
  expect(msg.body).toBe(null)
})
