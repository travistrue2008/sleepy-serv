import { MessageType } from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { Fmt, waitFor, createServer, createClient } from '../../helpers'

import {
  createWsClients,
  closeWsClients,
  getAdminPort,
  listenForNotifications,
} from '../../helpers'

test('when triggered from handler', async () => {
  const server = await createServer(import.meta.dirname)
  const wsClients = await createWsClients(server)
  const received = listenForNotifications(wsClients)
  const reqClient = createClient(server)

  await reqClient.post('/handler-trigger-broadcast', Fmt.Text)

  await waitFor(() => received.length === 3)
  await closeWsClients(wsClients)
  await server.kill()

  const expectedClientIds = wsClients.map(client => client.id!).sort()
  const actualClientIds = received.map(client => client.clientId!).sort()

  expect(expectedClientIds).toStrictEqual(actualClientIds)

  expect(received).toStrictEqual([
    {
      id: received[0].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'state_changed',
      timestamp: received[0].timestamp,
      headers: {},
      body: { score: 1 },
    },
    {
      id: received[1].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'state_changed',
      timestamp: received[1].timestamp,
      headers: {},
      body: { score: 1 },
    },
    {
      id: received[2].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'state_changed',
      timestamp: received[2].timestamp,
      headers: {},
      body: { score: 1 },
    },
  ])
})

test('when triggered from middleware', async () => {
  const server = await createServer(import.meta.dirname)
  const wsClients = await createWsClients(server)
  const received = listenForNotifications(wsClients)
  const reqClient = createClient(server)

  await reqClient.post('/middleware-trigger-broadcast', Fmt.Text)

  await waitFor(() => received.length === 3)
  await closeWsClients(wsClients)
  await server.kill()

  const expectedClientIds = wsClients.map(client => client.id!).sort()
  const actualClientIds = received.map(client => client.clientId!).sort()

  expect(expectedClientIds).toStrictEqual(actualClientIds)

  expect(received).toStrictEqual([
    {
      id: received[0].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'state_changed',
      timestamp: received[0].timestamp,
      headers: {},
      body: { score: 1 },
    },
    {
      id: received[1].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'state_changed',
      timestamp: received[1].timestamp,
      headers: {},
      body: { score: 1 },
    },
    {
      id: received[2].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'state_changed',
      timestamp: received[2].timestamp,
      headers: {},
      body: { score: 1 },
    },
  ])
})

test('when triggered from app', async () => {
  const server = await createServer(import.meta.dirname)
  const adminPort = await getAdminPort(server)
  const wsClients = await createWsClients(server)
  const received = listenForNotifications(wsClients)
  const reqClient = createClient({ port: adminPort })

  await reqClient.post('/app-trigger-broadcast', Fmt.Text)

  await waitFor(() => received.length === 3)
  await closeWsClients(wsClients)
  await server.kill()

  const expectedClientIds = wsClients.map(client => client.id!).sort()
  const actualClientIds = received.map(client => client.clientId!).sort()

  expect(expectedClientIds).toStrictEqual(actualClientIds)

  expect(received).toStrictEqual([
    {
      id: received[0].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'state_changed',
      timestamp: received[0].timestamp,
      headers: {},
      body: { score: 1 },
    },
    {
      id: received[1].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'state_changed',
      timestamp: received[1].timestamp,
      headers: {},
      body: { score: 1 },
    },
    {
      id: received[2].id,
      clientId: expect.any(String),
      type: MessageType.Notification,
      event: 'state_changed',
      timestamp: received[2].timestamp,
      headers: {},
      body: { score: 1 },
    },
  ])
})
