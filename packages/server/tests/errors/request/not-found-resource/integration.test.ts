import { test, expect } from 'bun:test'

import { StatusCode } from '../../../../src'

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

  expect(result.status).toBe(StatusCode.NotFound)
  expect(result.body).toBe(null)
})

test('when requested resource is not found (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)
  const msg = await ws.get('/users/123/photos')

  await server.kill()

  expect(msg.status).toBe(StatusCode.NotFound)
  expect(msg.body).toBe(null)
})
