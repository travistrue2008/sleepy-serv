import { test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../helpers'
import { MethodNotAllowedError } from '../../../../packages/server/src/errors'

test('when the route exists but the method is not allowed', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'POST',
    route: '/',
  })

  await shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.clientId,
    type: TYPES.RESPONSE,
    status: MethodNotAllowedError.status,
    timestamp: res.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: null,
  })
})
