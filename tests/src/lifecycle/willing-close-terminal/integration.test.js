import { test, expect } from 'bun:test'
import { NotFoundError } from '../../../../packages/server/src/errors'
import { putSession, createServer, createSocketClient } from '../../helpers'

test('when a willingly-closed clientId is reclaimed', async () => {
  const server = await createServer(import.meta.dirname)
  const client = await createSocketClient(server.port)

  await client.close()

  const res = await putSession(server.port, client.clientId, client.token)

  await server.stop(true)

  expect(res.status).toBe(NotFoundError.status)
  expect(res.body).toBe(null)
})
