import SleepySocketClient from 'sleepy-socket'
import { CloseCode, CloseReason, createApp } from 'sleepy-serv'
import { mock, test, expect } from 'bun:test'
import { wait, waitFor } from '../../helpers'

test('when closed from client AND reconnect enabled', async () => {
  const onClose = mock()
  const handler = mock()
  const app = createApp(0, { ws: { onClose } })
  const host = app.server.url.hostname
  const port = app.server.port!

  const client = await SleepySocketClient.open(host, port, {
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  })

  client.on('close', handler)
  client.socket!.close(4000)

  console.log('client.isConnected', client.isConnected)

  await waitFor(() => !client.isConnected)
  await waitFor(() => client.isConnected)
  await client.close()
  await app.close(true)

  expect(handler).toHaveBeenCalledTimes(2)
  expect(handler).toHaveBeenNthCalledWith(1, { code: 4000 })
  expect(handler).toHaveBeenNthCalledWith(2, { code: CloseCode.Ok })
  expect(onClose).toHaveBeenCalledTimes(2)

  expect(onClose).toHaveBeenNthCalledWith(
    1,
    client.id,
    CloseReason.Dropped,
  )

  expect(onClose).toHaveBeenNthCalledWith(
    2,
    client.id,
    CloseReason.Dropped,
  )
})

test('when closed from client AND reconnect disabled', async () => {
  const onClose = mock()
  const handler = mock()
  const app = createApp(0, { ws: { onClose } })
  const host = app.server.url.hostname
  const port = app.server.port!

  const client = await SleepySocketClient.open(host, port, {
    reconnect: false,
  })

  client.on('close', handler)
  client.socket!.close(4000)

  await waitFor(() => !client.isConnected)
  await wait(100) /* reconnect should NOT happen during this time */
  await app.close(true)

  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith({ code: 4000 })
  expect(onClose).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledWith(client.id, CloseReason.Dropped)
})
