import { test, expect } from 'bun:test'
import { boot, waitFor } from '../../helpers'

/*
  Drives the resilience path over real loopback sockets: an involuntary drop
  the app did not initiate should trigger auto-reconnect, reclaim the same
  clientId via PUT /ws/:clientId, and leave the client able to send again.
  Closing the underlying socket with an application code (4000) rather than
  1000 makes the server treat it as involuntary and open a reclaim window.
 */

test('when the socket drops AND the client reconnects', async () => {
  const { client, shutdown } = await boot(import.meta.dirname, {
    client: {
      reconnect: {
        minDelay: 20,
        random: () => 0,
      },
    },
  })

  const clientId = client.clientId
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

  await shutdown()

  expect(client.clientId).toBe(clientId)
  expect(res.status).toBe(200)
  expect(res.body).toStrictEqual({ ok: true })
})
