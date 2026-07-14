import { test, expect } from 'bun:test'
import { boot, waitFor } from '../../helpers'
import { TYPES } from '../../../../packages/server/src/messages'

/*
  Drives server-initiated notifications over real loopback sockets. The server
  pushes via app.broadcast / app.send and the client receives them through its
  `notification` EventEmitter surface. Delivery is in-session only, so a send to
  an unknown clientId reaches nobody.
 */

test('when the server broadcasts', async () => {
  const { client, app, shutdown } = await boot(import.meta.dirname)
  const received = []

  client.on('notification', message => received.push(message))
  app.commands.broadcast('state_changed', { score: 1 })

  await waitFor(() => received.length > 0)
  await shutdown()

  expect(received[0]).toStrictEqual({
    id: received[0].id,
    clientId: client.clientId,
    type: TYPES.NOTIFICATION,
    event: 'state_changed',
    timestamp: received[0].timestamp,
    headers: {},
    body: { score: 1 },
  })
})

test('when the server sends to a clientId', async () => {
  const { client, app, shutdown } = await boot(import.meta.dirname)
  const received = []

  client.on('notification', message => received.push(message))
  app.commands.send(client.clientId, 'player_joined', { name: 'x' })

  await waitFor(() => received.length > 0)
  await shutdown()

  expect(received[0]).toStrictEqual({
    id: received[0].id,
    clientId: client.clientId,
    type: TYPES.NOTIFICATION,
    event: 'player_joined',
    timestamp: received[0].timestamp,
    headers: {},
    body: { name: 'x' },
  })
})

test('when the server sends to an unknown clientId', async () => {
  const { client, app, shutdown } = await boot(import.meta.dirname)
  const received = []

  client.on('notification', message => received.push(message))

  const fn = () => app.commands.send(
    '00000000-0000-0000-0000-000000000000',
    'state_changed',
    { score: 1 },
  )

  expect(fn).toThrow(ReferenceError)

  await shutdown()

  expect(received).toStrictEqual([])
})
