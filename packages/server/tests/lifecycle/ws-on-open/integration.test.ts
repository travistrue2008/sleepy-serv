import { test, expect } from 'bun:test'
import { createServer, createSocketClient } from '../../helpers'

test('when a connection is opened', async () => {
  const server = await createServer(import.meta.dirname)
  const ws = await createSocketClient(server)

  await ws.close()
  await server.kill()

  expect(
    server.output.some(
      line => line.includes(`OPENED:${ws.clientId}`),
    ),
  ).toBe(true)
})
