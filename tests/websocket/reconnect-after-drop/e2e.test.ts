import SleepySocketClient from 'sleepy-socket'
import { StatusCode, ServerCloseSignals } from 'sleepy-serv'
import { test, expect } from 'bun:test'
import { createServer, waitFor } from '../../helpers'

/*
  Drives the resilience path over real loopback sockets: an involuntary drop
  the app did not initiate should trigger auto-reconnect, reclaim the same
  clientId via PUT /ws/:clientId, and leave the client able to send again.
  Closing the underlying socket with the Reaped code simulates a
  server-side timeout, which the client treats as reconnectable.
 */

test('when the socket drops AND the client reconnects', async () => {
  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open(
    'localhost',
    {
      port: server.port,
      reconnect: {
        minDelay: 20,
        random: () => 0,
      },
    },
  )

  const id = client.id
  const oldSocket = client.socket

  client.socket!.close(
    ServerCloseSignals.Reaped.code,
    ServerCloseSignals.Reaped.reason,
  )

  /*
    isConnected flips true only once the reconnect welcome is processed, so
    this waits for a fully-established socket rather than a merely-constructed
    one. The socket check guards the brief window right after the close
    where the old socket is still set before its close event fires.
   */

  await waitFor(() => client.isConnected && client.socket !== oldSocket)

  const result = await client.get('/ok')

  await client.close()
  await server.kill()

  expect(client.id).toBe(id)
  expect(result.status).toBe(StatusCode.Ok)
  expect(result.body).toStrictEqual({ ok: true })
})
