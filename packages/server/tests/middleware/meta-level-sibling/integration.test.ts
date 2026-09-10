import { test, expect } from 'bun:test'

import { StatusCode } from '../../../src'

import {
  Fmt,
  createServer,
  createClient,
  createSocketClient,
} from '../../helpers'

test('when sibling-level meta middleware is defined (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/users', Fmt.Text)

  await server.kill()

  expect(result.status).toBe(StatusCode.Ok)
  expect(result.body).toBe('sibling-meta')
})

test('when sibling-level meta middleware is defined (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)
  const msg = await ws.get('/users')

  await server.kill()

  expect(msg.status).toBe(StatusCode.Ok)
  expect(msg.body).toBe('sibling-meta')
})
