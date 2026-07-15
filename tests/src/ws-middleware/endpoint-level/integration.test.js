import { test, expect } from 'bun:test'
import { createServer, postSession } from '../../helpers'

import {
  NotFoundError,
  UnauthorizedError,
} from '../../../../packages/server/src/errors'

/*
  File-based middleware attaches to the reserved handshake endpoints just like a
  normal route. api/ws/post.js guards the mint step; the built-in handshake
  handler is appended as the terminal and runs only after the app middleware
  returns next(). The guard is scoped to /ws and does not leak to other routes.
 */

const WS_HEADER = { 'x-ws': '1' }

test('when a method-file guard rejects the POST handshake', async () => {
  const server = await createServer(import.meta.dirname)
  const res = await postSession(server.port)

  await server.stop(true)

  expect(res.status).toBe(UnauthorizedError.status)
})

test('when a method-file guard permits the POST handshake', async () => {
  const server = await createServer(import.meta.dirname)
  const res = await postSession(server.port, WS_HEADER)

  await server.stop(true)

  expect(res.status).toBe(200)
  expect(res.body).toHaveProperty('clientId')
  expect(res.body).toHaveProperty('ticket')
})

test('when a method-file guard rejects the GET upgrade', async () => {
  const server = await createServer(import.meta.dirname)
  const res = await fetch(`http://localhost:${server.port}/ws?ticket=bogus`)

  await server.stop(true)

  expect(res.status).toBe(UnauthorizedError.status)
})

test('when a method-file guard permits the GET upgrade', async () => {
  const server = await createServer(import.meta.dirname)

  const res = await fetch(`http://localhost:${server.port}/ws?ticket=bogus`, {
    headers: WS_HEADER,
  })

  await server.stop(true)

  expect(res.status).toBe(NotFoundError.status)
})

test('when a REST route sits outside the handshake guard', async () => {
  const server = await createServer(import.meta.dirname)
  const res = await fetch(`http://localhost:${server.port}/ping`)
  const body = await res.json()

  await server.stop(true)

  expect(res.status).toBe(200)
  expect(body).toStrictEqual({ ok: true })
})
