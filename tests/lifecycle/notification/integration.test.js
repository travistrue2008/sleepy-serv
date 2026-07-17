import { test, expect } from 'bun:test'
import { waitFor } from '../../helpers'
import { createApp } from 'sleepy-serv'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

test('when the server broadcasts', async () => {
  const received = []
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)

  client.on('notification', message => received.push(message))
  app.commands.broadcast('state_changed', { score: 1 })

  await waitFor(() => received.length > 0)
  await client.close()
  await app.server.stop(true)

  expect(received[0]).toStrictEqual({
    id: received[0].id,
    clientId: client.id,
    type: TYPES.NOTIFICATION,
    event: 'state_changed',
    timestamp: received[0].timestamp,
    headers: {},
    body: { score: 1 },
  })
})

test('when the server sends to a clientId', async () => {
  const received = []
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)

  client.on('notification', message => received.push(message))
  app.commands.send(client.id, 'player_joined', { name: 'x' })

  await waitFor(() => received.length > 0)
  await client.close()
  await app.server.stop(true)

  expect(received[0]).toStrictEqual({
    id: received[0].id,
    clientId: client.id,
    type: TYPES.NOTIFICATION,
    event: 'player_joined',
    timestamp: received[0].timestamp,
    headers: {},
    body: { name: 'x' },
  })
})

test('when the server sends to an unknown clientId', async () => {
  const CLIENT_ID = '00000000-0000-0000-0000-000000000000'

  const received = []
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)

  client.on('notification', message => received.push(message))

  const fn = () => app.commands.send(
    CLIENT_ID,
    'state_changed',
    { score: 1 },
  )

  expect(fn).toThrow(
    new ReferenceError(`No live socket for client: ${CLIENT_ID}`),
  )

  await client.close()
  await app.server.stop(true)

  expect(received).toStrictEqual([])
})
