import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'

const CTX = {
  gameId: 'g1',
  playerId: 'p1',
}

test('when "ctx" is provided to the POST handshake', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.connect(host, port, { ctx: CTX })

  await client.close()
  await app.close(true)

  expect(client.connectionData).toStrictEqual(CTX)
})
