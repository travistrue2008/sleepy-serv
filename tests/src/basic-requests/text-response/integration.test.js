import { test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../helpers'

test('when the handler returns a non-JSON (text) response', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/greeting',
  })

  await shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    clientId: res.clientId,
    type: TYPES.RESPONSE,
    status: 200,
    timestamp: res.timestamp,
    headers: {},
    body: 'Just text',
  })
})
