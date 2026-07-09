import SleepySocketClient from 'sleepy-socket'
import { createApp } from 'sleepy-serv'

/*
  Boot a real sleepy-serv server for a fixture directory and connect a real
  sleepy-socket client to it. Port 0 lets Bun pick a free ephemeral port, so
  parallel test files never collide; the client dials the actual bound port.

  opts.client is forwarded to SleepySocketClient.connect (queue, secure,
  timeout); all other opts pass through to createApp.
 */

export async function boot(dirname, opts = {}) {
  const { client: clientOpts, ...appOpts } = opts

  const app = await createApp(0, dirname, appOpts)
  const port = app.server.port
  const client = await SleepySocketClient.connect('localhost', port, clientOpts)

  return {
    port,
    client,
    app,
    async shutdown() {
      await client.close()
      await app.server.stop(true)
    },
  }
}
