import SleepySocketClient from 'sleepy-socket'
import { StatusCode, createApp } from 'sleepy-serv'
import { test, expect } from 'bun:test'
import { waitFor } from '../../helpers'

const CTX = {
  gameId: 'g1',
  playerId: 'p1',
}

test('when a "ctx" is provided to the PUT handshake', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!

  const client = await SleepySocketClient.connect(host, port, {
    ctx: CTX,
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  })

  const oldSocket = client.socket

  client.socket!.close(4000)

  await waitFor(() => client.isConnected && client.socket !== oldSocket)

  const res = await client.get('/app-data')

  await client.close()
  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toStrictEqual({ app: CTX })
})
