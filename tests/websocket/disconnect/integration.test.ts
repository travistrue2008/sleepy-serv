import SleepySocketClient from 'sleepy-socket'
import { mock, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import { waitFor } from '../../helpers'

test('when the disconnect event fires on involuntary close', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const handler = mock()

  const client = await SleepySocketClient.connect(host, port, {
    reconnect: false,
  })

  client.on('disconnect', handler)
  client.socket!.close(4000)

  await waitFor(() => !client.isConnected)
  await app.close(true)

  expect(handler).toHaveBeenCalledOnce()

  expect(handler).toHaveBeenCalledWith({
    code: 4000,
  })
})
