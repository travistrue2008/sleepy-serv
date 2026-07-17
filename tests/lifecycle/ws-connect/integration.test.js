import { test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

const HEARTBEAT_INTERVAL = 20

test('when the client connects', async () => {
  const app = await createApp(0, import.meta.dirname, {
    ws: {
      heartbeatInterval: HEARTBEAT_INTERVAL,
    },
  })

  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)

  await client.close()
  await app.server.stop(true)

  expect(client.clientId).toBeTruthy()
  expect(client.heartbeatInterval).toBe(HEARTBEAT_INTERVAL)
})

test('when a request carries the cached clientId', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)

  const res = await client.send({
    method: 'GET',
    route: '/ok',
  })

  await client.close()
  await app.server.stop(true)

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.clientId,
    type: TYPES.RESPONSE,
    status: 200,
    timestamp: res.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: { ok: true },
  })
})
