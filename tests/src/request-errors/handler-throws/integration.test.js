import { test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../helpers'

test('when the handler itself throws a RequestError', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/boom',
  })

  await shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    clientId: res.clientId,
    type: TYPES.RESPONSE,
    status: 500,
    timestamp: res.timestamp,
    headers: {},
    body: 'Boom',
  })
})
