import { test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../helpers'

test('when making a POST request with a body', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'POST',
    route: '/echo',
    body: {
      count: 3,
      name: 'ada',
    },
  })

  await shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    clientId: res.clientId,
    type: TYPES.RESPONSE,
    status: 200,
    timestamp: res.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: {
      received: {
        count: 3,
        name: 'ada',
      },
    },
  })
})
