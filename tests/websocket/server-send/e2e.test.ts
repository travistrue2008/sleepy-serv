import { MessageType } from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { Fmt, createClient, createServer, wait } from '../../helpers'

import {
  createWsClients,
  closeWsClients,
  listenForNotifications,
  getAdminPort,
} from '../../helpers'

test('when triggered from handler', async () => {
  const server = await createServer(import.meta.dirname)
  const wsClients = await createWsClients(server)
  const received = listenForNotifications(wsClients)
  const reqClient = createClient(server)

  await reqClient.post('/handler-trigger-send', Fmt.Json, {
    body: JSON.stringify({
      userId: 'user-2',
    }),
  })

  await wait(20) /* give enough time for sockets to report/not report */
  await closeWsClients(wsClients)
  await server.kill()

  const expectedClientIds = wsClients
    .filter((_client, index) => index !== 1)
    .map(client => client.id!)
    .sort()

  const actualClientIds = received.map(client => client.clientId!).sort()

  expect(expectedClientIds).toStrictEqual(actualClientIds)

  expect(received).toStrictEqual([
    {
      id: received[0].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'player_joined',
      timestamp: received[0].timestamp,
      headers: {},
      body: {
        message: 'Hello from user-2',
      },
    },
    {
      id: received[1].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'player_joined',
      timestamp: received[1].timestamp,
      headers: {},
      body: {
        message: 'Hello from user-2',
      },
    },
  ])
})

test('when triggered from middleware', async () => {
  const server = await createServer(import.meta.dirname)
  const wsClients = await createWsClients(server)
  const received = listenForNotifications(wsClients)
  const reqClient = createClient(server)

  await reqClient.post('/middleware-trigger-send', Fmt.Json, {
    body: JSON.stringify({
      userId: 'user-2',
    }),
  })

  await wait(20) /* give enough time for sockets to report/not report */
  await closeWsClients(wsClients)
  await server.kill()

  const expectedClientIds = wsClients
    .filter((_client, index) => index !== 1)
    .map(client => client.id!)
    .sort()

  const actualClientIds = received.map(client => client.clientId!).sort()

  expect(expectedClientIds).toStrictEqual(actualClientIds)

  expect(received).toStrictEqual([
    {
      id: received[0].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'player_joined',
      timestamp: received[0].timestamp,
      headers: {},
      body: {
        message: 'Hello from user-2',
      },
    },
    {
      id: received[1].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'player_joined',
      timestamp: received[1].timestamp,
      headers: {},
      body: {
        message: 'Hello from user-2',
      },
    },
  ])
})

test('when triggered from app', async () => {
  const server = await createServer(import.meta.dirname)
  const adminPort = await getAdminPort(server)
  const wsClients = await createWsClients(server)
  const received = listenForNotifications(wsClients)
  const reqClient = createClient({ port: adminPort })

  await reqClient.post('/app-trigger-send', Fmt.Text, {
    body: JSON.stringify({
      userId: 'user-2',
    }),
  })

  await wait(20) /* give enough time for sockets to report/not report */
  await closeWsClients(wsClients)
  await server.kill()

  const expectedClientIds = wsClients
    .filter((_client, index) => index !== 1)
    .map(client => client.id!)
    .sort()

  const actualClientIds = received.map(client => client.clientId!).sort()

  expect(expectedClientIds).toStrictEqual(actualClientIds)

  expect(received).toStrictEqual([
    {
      id: received[0].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'player_joined',
      timestamp: received[0].timestamp,
      headers: {},
      body: {
        message: 'Hello from user-2',
      },
    },
    {
      id: received[1].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'player_joined',
      timestamp: received[1].timestamp,
      headers: {},
      body: {
        message: 'Hello from user-2',
      },
    },
  ])
})
