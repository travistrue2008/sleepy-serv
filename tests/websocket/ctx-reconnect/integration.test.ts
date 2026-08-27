import SleepySocketClient from 'sleepy-socket'
import { StatusCode, createApp } from 'sleepy-serv'
import { spyOn, test, expect } from 'bun:test'
import { waitFor } from '../../helpers'

const CTX = {
  gameId: 'g1',
  playerId: 'p1',
}

test('when reconnecting AND "ctx" IS provided', async () => {
  const fetchSpy = spyOn(global, 'fetch')
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

  expect(fetchSpy).toHaveBeenNthCalledWith(
    1,
    `${app.server.url.origin}/ws`,
    expect.objectContaining({
      method: 'POST',
    }),
  )

  expect(fetchSpy).toHaveBeenNthCalledWith(
    2,
    `${app.server.url.origin}/ws/${client.id}`,
    {
      method: 'PUT',
      headers: {
        authorization: expect.any(String),
      },
    },
  )

  fetchSpy.mockRestore()
})
