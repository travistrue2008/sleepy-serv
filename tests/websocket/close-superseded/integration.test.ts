import SleepySocketClient from 'sleepy-socket'
import { mock, test, expect } from 'bun:test'
import { CloseReason, createApp } from 'sleepy-serv'
import { waitFor } from '../../helpers'

test('when superseded AND reconnect enabled', async () => {
  const onClose = mock()
  const handler = mock()
  const app = await createApp(0, import.meta.dirname, { ws: { onClose } })
  const host = app.server.url.hostname
  const port = app.server.port!

  const client = await SleepySocketClient.connect(host, port, {
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  })

  client.on('disconnect', handler)

  const reclaimRes = await fetch(
    `http://${host}:${port}/ws/${client.id}`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${client.token}`,
      },
    },
  )

  const { ticket } = await reclaimRes.json() as { ticket: string }
  const ws2 = new WebSocket(`ws://${host}:${port}/ws?ticket=${ticket}`)

  await new Promise<void>(resolve => {
    ws2.addEventListener('message', () => resolve(), { once: true })
  })

  await waitFor(() => handler.mock.calls.length > 0)

  ws2.close()

  await app.close(true)

  expect(handler).toHaveBeenCalledOnce()

  expect(onClose).toHaveBeenNthCalledWith(
    1,
    client.id,
    CloseReason.Superseded,
  )
})

test('when superseded AND reconnect disabled', async () => {
  const onClose = mock()
  const handler = mock()
  const app = await createApp(0, import.meta.dirname, { ws: { onClose } })
  const host = app.server.url.hostname
  const port = app.server.port!

  const client = await SleepySocketClient.connect(host, port, {
    reconnect: false,
  })

  client.on('disconnect', handler)

  const reclaimRes = await fetch(
    `http://${host}:${port}/ws/${client.id}`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${client.token}`,
      },
    },
  )

  const { ticket } = await reclaimRes.json() as { ticket: string }

  const ws2 = new WebSocket(
    `ws://${host}:${port}/ws?ticket=${ticket}`,
  )

  await new Promise<void>(resolve => {
    ws2.addEventListener('message', () => resolve(), { once: true })
  })

  await waitFor(() => handler.mock.calls.length > 0)

  ws2.close()

  await app.close(true)

  expect(handler).toHaveBeenCalledOnce()

  expect(onClose).toHaveBeenNthCalledWith(
    1,
    client.id,
    CloseReason.Superseded,
  )
})
