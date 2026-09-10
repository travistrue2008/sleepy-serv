import { test, expect } from 'bun:test'

import { StatusCode } from '../../../src'

import {
  createServer,
  createClient,
  createSocketClient,
  Fmt,
} from '../../helpers'

test('when making a root-level request (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/', Fmt.Text)

  await server.kill()

  expect(result.status).toBe(StatusCode.Ok)
  expect(result.body).toBe('Hello world')
})

test('when making a root-level request (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)
  const msg = await ws.get('/')

  await server.kill()

  expect(msg.status).toBe(StatusCode.Ok)
  expect(msg.body).toBe('Hello world')
})
