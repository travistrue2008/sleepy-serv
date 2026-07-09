import { test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../_helpers'

test.each([
  'PUT',
  'PATCH',
  'DELETE',
])('when making a %s request', async method => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method,
    route: '/resource',
  })

  await shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: 200,
    timestamp: res.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: { method },
  })
},
)
