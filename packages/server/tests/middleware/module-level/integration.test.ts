import { test, expect } from 'bun:test'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../helpers'

test('when module-level middleware is defined (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/users', Fmt.Text)

  await server.kill()

  expect(result.status).toBe(200)
  expect(result.body).toBe('module')
})

test('when module-level middleware is defined (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)
  const msg = await ws.get('/users')

  await server.kill()

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('module')
})
