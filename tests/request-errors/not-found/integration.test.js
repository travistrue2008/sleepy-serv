import { test, expect } from 'bun:test'
import { NotFoundError } from 'sleepy-serv'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../_helpers'

test('when the route does not exist', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/nope',
  })

  await shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: NotFoundError.status,
    timestamp: res.timestamp,
    headers: {},
    body: null,
  })
})
