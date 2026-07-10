import { test, expect } from 'bun:test'
import { boot } from '../../helpers'

const HEARTBEAT_INTERVAL = 20

test('when the client connects', async () => {
  const { client, shutdown } = await boot(import.meta.dirname, {
    ws: {
      heartbeatInterval: HEARTBEAT_INTERVAL,
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

  expect(res.clientId).toBe(client.clientId)
  expect(res.status).toBe(200)
  expect(res.body).toStrictEqual({ ok: true })
})
