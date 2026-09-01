import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { StatusCode, createApp } from 'sleepy-serv'

const CTX = {
  gameId: 'g1',
  playerId: 'p1',
}

test('when an endpoint accesses the active session context', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.open(host, port, { ctx: CTX })
  const res = await client.get('/app-data')

  await client.close()
  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toStrictEqual({ app: CTX })
})
