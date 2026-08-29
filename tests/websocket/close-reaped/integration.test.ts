import SleepySocketClient from 'sleepy-socket'
import { mock, test, expect } from 'bun:test'
import { CloseCode, CloseReason, createApp } from 'sleepy-serv'
import { wait, waitFor } from '../../helpers'

test('when reaped AND reconnect enabled', async () => {
  const onClose = mock()
  const handler = mock()

  const app = await createApp(0, import.meta.dirname, {
    ws: {
      heartbeatInterval: 200_000,
      dropThreshold: 100,
      onClose,
    },
  })

  const host = app.server.url.hostname
  const port = app.server.port!

  const client = await SleepySocketClient.connect(host, port, {
    serverTimeout: 500,
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  })

  client.on('close', handler)

  await waitFor(() => !client.isConnected)
  await waitFor(() => client.isConnected)
  await client.close()

  await app.close(true)

  expect(handler).toHaveBeenCalledTimes(2)
  expect(handler).toHaveBeenNthCalledWith(1, { code: CloseCode.Reaped })
  expect(handler).toHaveBeenNthCalledWith(2, { code: CloseCode.Normal })
  expect(onClose).toHaveBeenCalledTimes(2)

  expect(onClose).toHaveBeenNthCalledWith(
    1,
    client.id,
    CloseReason.Reaped,
  )

  expect(onClose).toHaveBeenNthCalledWith(
    2,
    client.id,
    CloseReason.Dropped,
  )
})

test('when reaped AND reconnect disabled', async () => {
  const onClose = mock()
  const handler = mock()

  const app = await createApp(0, import.meta.dirname, {
    ws: {
      heartbeatInterval: 200_000,
      dropThreshold: 100,
      onClose,
    },
  })

  const host = app.server.url.hostname
  const port = app.server.port!

  const client = await SleepySocketClient.connect(host, port, {
    serverTimeout: 500,
    reconnect: false,
  })

  client.on('close', handler)

  await waitFor(() => !client.isConnected)
  await wait(100)
  await app.close(true)

  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith({ code: CloseCode.Reaped })
  expect(onClose).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledWith(client.id, CloseReason.Reaped)
})
