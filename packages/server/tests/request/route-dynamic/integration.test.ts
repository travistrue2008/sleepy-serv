import { test, expect } from 'bun:test'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../helpers'

test('when making a request with dynamic route param (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/users/123', Fmt.Text)

  await server.kill()

  expect(result.status).toBe(200)
  expect(result.body).toBe('Fetching user: 123')
})

test('when making a request with dynamic route param (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)
  const msg = await ws.get('/users/123')

  await server.kill()

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('Fetching user: 123')
})
