import { test, expect } from 'bun:test'
import { UnauthorizedError } from 'sleepy-serv'
import { boot, createServer, postSession, putSession } from '../../helpers'

/*
  App-level middleware (opts.middleware) now runs on the reserved handshake
  endpoints, exactly like it runs on file-routed REST endpoints. This fixture
  defines no api/ws files, so the reserved endpoints are synthesized and carry
  only the app-level chain plus the built-in handshake terminal.
 */

const AUTH_HEADER = { 'x-auth': 'secret' }
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000'

function requireAuth (req, _res, next) {
  console.log('requireAuth()')

  if (!req.headers.get('x-auth')) {
    throw new UnauthorizedError()
  }

  return next()
}

test('when app-level middleware rejects the POST handshake', async () => {
  const server = await createServer(import.meta.dirname, {
    middleware: [requireAuth],
  })

  const res = await postSession(server.port)

  await server.stop(true)

  expect(res.status).toBe(UnauthorizedError.status)
})

test('when app-level middleware rejects the PUT handshake', async () => {
  const server = await createServer(import.meta.dirname, {
    middleware: [requireAuth],
  })

  const res = await putSession(server.port, UNKNOWN_ID, 'token')

  await server.stop(true)

  expect(res.status).toBe(UnauthorizedError.status)
})

test('when app-level middleware permits the POST handshake', async () => {
  const server = await createServer(import.meta.dirname, {
    middleware: [requireAuth],
  })

  const res = await postSession(server.port, AUTH_HEADER)

  await server.stop(true)

  expect(res.status).toBe(200)
  expect(res.body).toHaveProperty('clientId')
  expect(res.body).toHaveProperty('ticket')
})

test('when a client connects with app-level middleware', async () => {
  const traversed = []

  const recorder = (req, _res, next) => {
    traversed.push(`${req.method} ${req.route}`)

    return next()
  }

  const { shutdown } = await boot(import.meta.dirname, {
    server: {
      middleware: [recorder],
    },
  })

  await shutdown()

  expect(traversed).toContain('POST /ws')
  expect(traversed).toContain('GET /ws')
})
