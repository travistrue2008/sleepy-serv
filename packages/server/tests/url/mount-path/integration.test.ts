import { test, expect } from 'bun:test'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../helpers'

test('when adding a mount path (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)

  const result = await client.get('/users', Fmt.Text, {
    mountPath: '/test-mount-path',
  })

  await server.kill()

  expect(result.status).toBe(200)
  expect(result.body).toBe('Hello world')
})

test('when adding a mount path (ws)', async () => {
  const server = await createServer(import.meta.dirname)

  const ws = await createSocketClient(server, {
    mountPath: '/test-mount-path',
  })

  const msg = await ws.get('/test-mount-path/users')

  await server.kill()

  expect(msg.status).toBe(200)
  expect(msg.body).toBe('Hello world')
})
