import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createServer } from '../../helpers'

const HEARTBEAT_INTERVAL = 20

test('when the client connects', async () => {
  const server = await createServer(import.meta.dirname)
  const client = await SleepySocketClient.open('localhost', server.port)

  await client.close()
  await server.kill()

  expect(client.id).toBeTruthy()
  expect(client.heartbeatInterval).toBe(HEARTBEAT_INTERVAL)
})

test('when a request carries the cached clientId', async () => {
  const server = await createServer(import.meta.dirname)
  const client = await SleepySocketClient.open('localhost', server.port)
  const result = await client.get('/ok')

  await client.close()
  await server.kill()

  expect(result).toStrictEqual({
    id: result.id,
    clientId: client.id!,
    type: MessageType.Response,
    status: 200,
    timestamp: result.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: { ok: true },
  })
})
