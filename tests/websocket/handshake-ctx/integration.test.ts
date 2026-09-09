import SleepySocketClient from 'sleepy-socket'
import { createApp } from 'sleepy-serv'
import { test, expect } from 'bun:test'

const CTX = {
  gameId: 'g1',
  playerId: 'p1',
}

test('when "ctx" is provided to the POST handshake', async () => {
  const app = createApp(0)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.open(host, port, { ctx: CTX })

  await client.close()
  await app.close(true)

  expect(client.connectionData).toStrictEqual(CTX)
})
