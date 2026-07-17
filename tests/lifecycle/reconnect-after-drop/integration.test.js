import { test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import SleepySocketClient from 'sleepy-socket'
import { waitFor } from '../../helpers'

/*
  Drives the resilience path over real loopback sockets: an involuntary drop
  the app did not initiate should trigger auto-reconnect, reclaim the same
  clientId via PUT /ws/:clientId, and leave the client able to send again.
  Closing the underlying socket with an application code (4000) rather than
  1000 makes the server treat it as involuntary and open a reclaim window.
 */

test('when the socket drops AND the client reconnects', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname

  const client = await SleepySocketClient.connect(host, app.server.port, {
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  })

  const id = client.id
  const oldSocket = client.socket

  client.socket.close(4000)

  /*
      isConnected flips true only once the reconnect welcome is processed, so
      this waits for a fully-established socket rather than a merely-constructed
      one. The socket check guards the brief window right after close(4000)
      where the old socket is still set before its close event fires.
     */

  await waitFor(() => client.isConnected && client.socket !== oldSocket)

  const res = await client.send({
    method: 'GET',
    route: '/ok',
  })

  await client.close()
  await app.server.stop(true)

  expect(client.id).toBe(id)
  expect(res.status).toBe(200)
  expect(res.body).toStrictEqual({ ok: true })
})
