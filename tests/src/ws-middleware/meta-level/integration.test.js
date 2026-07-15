import { test, expect } from 'bun:test'
import { UnauthorizedError } from 'sleepy-serv'
import { createServer, postSession } from '../../helpers'

/*
  A meta.js under api/ws applies to the synthesized POST /ws endpoint even
  though it has no method file of its own, proving meta-module parity for the
  handshake. The reclaim endpoint has a method file, so meta reaches it through
  the normal file-route path.
 */

const META_HEADER = { 'x-meta': 'secret' }

test('when reserved-path meta rejects the synthesized POST', async () => {
  const server = await createServer(import.meta.dirname)
  const res = await postSession(server.port)

  await server.stop(true)

  expect(res.status).toBe(UnauthorizedError.status)
})

test('when reserved-path meta permits the synthesized POST', async () => {
  const server = await createServer(import.meta.dirname)
  const res = await postSession(server.port, META_HEADER)

  await server.stop(true)

  expect(res.status).toBe(200)
  expect(res.body).toHaveProperty('clientId')
  expect(res.body).toHaveProperty('ticket')
})
