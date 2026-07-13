import { test, expect } from 'bun:test'
import { boot } from '../../helpers'
import { TYPES } from '../../../../packages/server/src/messages'

const HEARTBEAT_INTERVAL = 20

test('when the client connects', async () => {
  const { client, shutdown } = await boot(import.meta.dirname, {
    server: {
      ws: {
        heartbeatInterval: HEARTBEAT_INTERVAL,
      },
    },
  })

  await shutdown()

  expect(client.clientId).toBeTruthy()
  expect(client.heartbeatInterval).toBe(HEARTBEAT_INTERVAL)
})

test('when a request carries the cached clientId', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/ok',
  })

  await shutdown()

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
