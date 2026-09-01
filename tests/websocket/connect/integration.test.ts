import { test, expect } from 'bun:test'
import { StatusCode, createApp } from 'sleepy-serv'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

const HEARTBEAT_INTERVAL = 20

test('when the client connects', async () => {
  const app = await createApp(0, import.meta.dirname, {
    ws: {
      heartbeatInterval: HEARTBEAT_INTERVAL,
    },
  })

  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.open(host, port)

  await client.close()
  await app.close(true)

  expect(client.id).toBeTruthy()
  expect(client.heartbeatInterval).toBe(HEARTBEAT_INTERVAL)
})

test('when a request carries the cached clientId', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.open(host, port)
  const res = await client.get('/ok')

  await client.close()
  await app.close(true)

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.id!,
    type: MessageType.Response,
    status: StatusCode.Ok,
    timestamp: res.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: { ok: true },
  })
})
