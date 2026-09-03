import SleepySocketClient from 'sleepy-socket'
import { mock, test, expect } from 'bun:test'
import { CloseCode, createApp } from 'sleepy-serv'
import { waitFor } from '../../helpers'

test('when the server drops a single client', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const handler = mock()

  const client = await SleepySocketClient.open(host, port, {
    reconnect: false,
  })

  client.on('close', handler)
  app.ws.drop(id => id === client.id!)

  await waitFor(() => !client.isConnected)

  await app.close(true)

  expect(handler).toHaveBeenCalledOnce()

  expect(handler).toHaveBeenCalledWith({
    code: CloseCode.Ok,
  })
})

test('when only one of two clients matches', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const handlerA = mock()
  const handlerB = mock()

  const clientA = await SleepySocketClient.open(host, port, {
    reconnect: false,
  })

  const clientB = await SleepySocketClient.open(host, port, {
    reconnect: false,
  })

  clientA.on('close', handlerA)
  clientB.on('close', handlerB)
  app.ws.drop(id => id === clientA.id!)

  await waitFor(() => !clientA.isConnected)

  expect(clientB.isConnected).toBe(true)

  await clientB.close()
  await app.close(true)

  expect(handlerA).toHaveBeenCalledOnce()

  expect(handlerA).toHaveBeenCalledWith({
    code: CloseCode.Ok,
  })
})
