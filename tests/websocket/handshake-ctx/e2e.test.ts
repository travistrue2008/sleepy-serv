import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createServer } from '../../helpers'

const CTX = {
  gameId: 'g1',
  playerId: 'p1',
}

test('when "ctx" is provided to the POST handshake', async () => {
  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open(
    'localhost',
    server.port,
    { ctx: CTX },
  )

  await client.close()
  await server.kill()

  expect(client.connectionData).toStrictEqual(CTX)
})
