import { test, expect } from 'bun:test'
import { UnauthorizedError } from '../../../../packages/server/src/errors'
import { putSession, createServer, createSocketClient } from '../../helpers'

test('when reclaiming with a valid token', async () => {
  const server = await createServer(import.meta.dirname)
  const client = await createSocketClient(server.port)
  const res = await putSession(server.port, client.clientId, client.token)

  await client.close()
  await server.stop(true)

  expect(client.clientId).toBe(res.body.clientId)
})

test('when the token is wrong', async () => {
  const TOKEN_INVALID = 'not-the-real-token'

  const server = await createServer(import.meta.dirname)
  const client = await createSocketClient(server.port)
  const res = await putSession(server.port, client.clientId, TOKEN_INVALID)

  await client.close()
  await server.stop(true)

  expect(res.status).toBe(UnauthorizedError.status)
  expect(res.body).toBe(null)
})
