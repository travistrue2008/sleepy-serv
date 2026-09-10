import { test, expect } from 'bun:test'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../../helpers'

test('when requested resource is not found (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/users/123/photos', Fmt.Json)

  await server.kill()

  expect(result.status).toBe(404)
  expect(result.body).toBe(null)
})

test('when requested resource is not found (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)
  const msg = await ws.get('/users/123/photos')

  await server.kill()

  expect(msg.status).toBe(404)
  expect(msg.body).toBe(null)
})
