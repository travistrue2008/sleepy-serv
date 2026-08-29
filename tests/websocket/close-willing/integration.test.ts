import SleepySocketClient from 'sleepy-socket'
import { mock, test, expect } from 'bun:test'
import { CloseCode, CloseReason, createApp } from 'sleepy-serv'
import { waitFor } from '../../helpers';

test('when closed from client AND reconnect enabled', async () => {
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

  await client.close()

  await waitFor(() => onClose.mock.calls.length > 0)
  await app.close(true)

  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith({ code: CloseCode.Normal })
  expect(onClose).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledWith(client.id, CloseReason.Willing)
})

test('when closed from client AND reconnect disabled', async () => {
  const onClose = mock()
  const handler = mock()
  const app = await createApp(0, import.meta.dirname, { ws: { onClose } })
  const host = app.server.url.hostname
  const port = app.server.port!

  const client = await SleepySocketClient.connect(host, port, {
    reconnect: false,
  })

  client.on('disconnect', handler)

  await client.close()

  await waitFor(() => onClose.mock.calls.length > 0)
  await app.close(true)

  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith({ code: CloseCode.Normal })
  expect(onClose).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledWith(client.id, CloseReason.Willing)
})
