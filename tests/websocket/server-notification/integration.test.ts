import { test, expect } from 'bun:test'
import { waitFor } from '../../helpers'
import { createApp } from 'sleepy-serv'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

import type { NotificationMessage } from 'sleepy-socket'

test('when the server broadcasts', async () => {
  const received: NotificationMessage[] = []
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.open(host, port)

  client.on('notification', message => {
    received.push(message as NotificationMessage)
  })

  app.ws.broadcast('state_changed', { score: 1 })

  await waitFor(() => received.length > 0)
  await client.close()
  await app.close(true)

  expect(received[0]).toStrictEqual({
    id: received[0].id,
    clientId: client.id!,
    type: MessageType.Notification,
    event: 'state_changed',
    timestamp: received[0].timestamp,
    headers: {},
    body: { score: 1 },
  })
})

test('when the server sends to a clientId', async () => {
  const received: NotificationMessage[] = []
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.open(host, port)

  client.on('notification', message => {
    received.push(message as NotificationMessage)
  })

  app.ws.send(id => id === client.id!, 'player_joined', { name: 'x' })

  await waitFor(() => received.length > 0)
  await client.close()
  await app.close(true)

  expect(received[0]).toStrictEqual({
    id: received[0].id,
    clientId: client.id!,
    type: MessageType.Notification,
    event: 'player_joined',
    timestamp: received[0].timestamp,
    headers: {},
    body: { name: 'x' },
  })
})

test('when the filter matches no clients', async () => {
  const received: NotificationMessage[] = []
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.open(host, port)

  client.on('notification', message => {
    received.push(message as NotificationMessage)
  })

  app.ws.send(() => false, 'state_changed', { score: 1 })

  await client.close()
  await app.close(true)

  expect(received).toStrictEqual([])
})
