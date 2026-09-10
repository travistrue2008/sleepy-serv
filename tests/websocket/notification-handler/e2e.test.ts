import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createServer, Fmt, createClient, waitFor } from '../../helpers'

import type { NotificationMessage } from 'sleepy-socket'

test('when invoked from REST', async () => {
  const received: NotificationMessage[] = []
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const wsClient = await SleepySocketClient.open('localhost', server.port)

  wsClient.on('notification', message => {
    received.push(message as NotificationMessage)
  })

  const result = await client.get('/notify', Fmt.Json, {
    query: {
      targetId: wsClient.id!,
    },
  })

  await waitFor(() => received.length > 0)
  await wsClient.close()
  await server.kill()

  expect(result.status).toBe(200)
  expect(result.body).toStrictEqual({ ok: true })
  expect(received).toHaveLength(1)

  expect(received[0]).toStrictEqual({
    id: received[0].id,
    clientId: wsClient.id!,
    type: 'notification',
    event: 'ping',
    timestamp: received[0].timestamp,
    headers: {},
    body: {
      message: 'hello',
    },
  })
})

test('when invoked from ws', async () => {
  const received: NotificationMessage[] = []
  const server = await createServer(import.meta.dirname)
  const clientA = await SleepySocketClient.open('localhost', server.port)
  const clientB = await SleepySocketClient.open('localhost', server.port)

  clientA.on('notification', message => {
    received.push(message as NotificationMessage)
  })

  const result = await clientB.get('/notify', {
    query: {
      targetId: clientA.id!,
    },
  })

  await waitFor(() => received.length > 0)
  await clientA.close()
  await clientB.close()
  await server.kill()

  expect(result.status).toBe(200)
  expect(result.body).toStrictEqual({ ok: true })
  expect(received).toHaveLength(1)

  expect(received[0]).toStrictEqual({
    id: received[0].id,
    clientId: clientA.id!,
    type: 'notification',
    event: 'ping',
    timestamp: received[0].timestamp,
    headers: {},
    body: {
      message: 'hello',
    },
  })
})
