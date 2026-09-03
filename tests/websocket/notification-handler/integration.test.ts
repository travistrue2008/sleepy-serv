import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { StatusCode, createApp } from 'sleepy-serv'
import { Fmt, createRequestor, waitFor } from '../../helpers'

import type { NotificationMessage } from 'sleepy-socket'

test('when invoked from REST', async () => {
  const received: NotificationMessage[] = []
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const req = createRequestor(app)

  const clientA = await SleepySocketClient.open(host, port)

  clientA.on('notification', message => {
    received.push(message as NotificationMessage)
  })

  const res = await req.get('/notify', Fmt.Json, {
    query: {
      targetId: clientA.id!,
    },
  })

  await waitFor(() => received.length > 0)
  await clientA.close()
  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toStrictEqual({ ok: true })
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

test('when invoked from ws', async () => {
  const received: NotificationMessage[] = []
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!

  const clientA = await SleepySocketClient.open(host, port)
  const clientB = await SleepySocketClient.open(host, port)

  clientA.on('notification', message => {
    received.push(message as NotificationMessage)
  })

  const res = await clientB.get('/notify', {
    query: {
      targetId: clientA.id!,
    },
  })

  await waitFor(() => received.length > 0)
  await clientA.close()
  await clientB.close()
  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toStrictEqual({ ok: true })
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
