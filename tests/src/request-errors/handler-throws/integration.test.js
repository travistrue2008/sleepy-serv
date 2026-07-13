import { test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../helpers'
import { InternalServerError } from '../../../../packages/server/src/errors'

test('when the handler itself throws a RequestError', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/boom',
  })

  await shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.clientId,
    type: TYPES.RESPONSE,
    status: InternalServerError.status,
    timestamp: res.timestamp,
    headers: {},
    body: 'Boom',
  })
})
