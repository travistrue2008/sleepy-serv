import SleepySocketClient from 'sleepy-socket'
import { mock, test, expect } from 'bun:test'
import { CloseCode, createApp } from 'sleepy-serv'
import { waitFor } from '../../helpers'

test('when the server drops the client', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const handler = mock()

  const client = await SleepySocketClient.open(host, port, {
    reconnect: false,
  })

  client.on('close', handler)
  app.ws.drop(client.id!)

  await waitFor(() => !client.isConnected)

  await app.close(true)

  expect(handler).toHaveBeenCalledOnce()

  expect(handler).toHaveBeenCalledWith({
    code: CloseCode.Ok,
  })
})
